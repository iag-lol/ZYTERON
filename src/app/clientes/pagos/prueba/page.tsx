import type {Metadata} from 'next';
import {PilotPayment} from '@/components/client-experience/pilot-payment';
export const metadata:Metadata={title:'Tu pago | Zyteron',robots:{index:false,follow:false,nocache:true}};
export default function PaymentPage(){return <PilotPayment/>;}
