import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
// غير المسارات دي بناءً على مكان ملفاتك الفعلي
import { db } from '@/db'; 
import { users } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  // 1. هنجيب المفتاح السري من ملف البيئة
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // 2. هنجيب الـ Headers عشان نتأكد إن الطلب جاي من Clerk
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // لو مفيش Headers، هنرفض الطلب فوراً للحماية
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // 3. نقرأ البيانات اللي جاية من Clerk
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. نتأكد من صحة البيانات باستخدام svix
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;

  // 5. لو الحدث هو إنشاء يوزر جديد (Sign Up)
  if (eventType === 'user.created') {
    const data = evt.data as any;
    const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata, public_metadata, phone_numbers } = data;

    const email = email_addresses?.[0]?.email_address || '';
    const fullName = (unsafe_metadata?.fullName as string) || 
      `${first_name || ''} ${last_name || ''}`.trim() || 
      'طالب جديد';
    const nationalId = (unsafe_metadata?.nationalId || public_metadata?.nationalId || '') as string;
    const phoneNumber = phone_numbers?.[0]?.phone_number || 
      (unsafe_metadata?.phoneNumber || public_metadata?.phoneNumber || '') as string;
    const university = (unsafe_metadata?.university || public_metadata?.university || 'جامعة كفر الشيخ') as string;
    const password = (unsafe_metadata?.password || '') as string;

    // هنسجل اليوزر في الداتا بيز باستخدام Drizzle وجدول users المحدّث
    await db.insert(users).values({
      id: id, // المعرف الأساسي
      clerkUserId: id, // معرف Clerk للربط
      fullName: fullName,
      nationalId: nationalId,
      phoneNumber: phoneNumber,
      email: email,
      password: password,
      university: university,
      avatarUrl: image_url || '',
      role: 'student',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`User ${id} (${fullName} - ${university}) was created successfully in users table`);
  }

  // 6. لو الحدث هو تحديث بيانات اليوزر
  if (eventType === 'user.updated') {
    const data = evt.data as any;
    const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata, public_metadata, phone_numbers } = data;

    const email = email_addresses?.[0]?.email_address || '';
    const fullName = (unsafe_metadata?.fullName as string) || 
      `${first_name || ''} ${last_name || ''}`.trim();
    const nationalId = (unsafe_metadata?.nationalId || public_metadata?.nationalId) as string | undefined;
    const phoneNumber = phone_numbers?.[0]?.phone_number || 
      (unsafe_metadata?.phoneNumber || public_metadata?.phoneNumber) as string | undefined;
    const university = (unsafe_metadata?.university || public_metadata?.university) as string | undefined;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (nationalId) updateData.nationalId = nationalId;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (university) updateData.university = university;
    if (image_url) updateData.avatarUrl = image_url;

    await db.update(users)
      .set(updateData)
      .where(eq(users.clerkUserId, id));
      
    console.log(`User ${id} was updated successfully in users table`);
  }

  // 7. لو الحدث هو حذف اليوزر
  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (id) {
      await db.delete(users).where(eq(users.clerkUserId, id));
    }
  }

  return new Response('Webhook received', { status: 200 });
}
