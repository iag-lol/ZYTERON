import {NextResponse} from 'next/server';
import {requirePortalAdminApiSession} from '@/lib/auth/portal-admin-api';
export async function POST(){const auth=await requirePortalAdminApiSession();if(auth.error)return auth.error;return NextResponse.json({error:'La venta se genera desde un pago efectivo verificado. Registra y verifica el abono en Finanzas.'},{status:409});}
