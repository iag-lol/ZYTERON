import type {Role} from '@zyteron/contracts';
/** The mount uses secure same-origin cookies. Browser headers never establish identity or MFA. */
export async function apiHeaders(role:Role,headers?:HeadersInit){void role;const result:Record<string,string>={'content-type':'application/json','x-request-id':crypto.randomUUID()};new Headers(headers).forEach((value,name)=>{if(!['authorization','x-zyteron-role','x-zyteron-user-id','x-zyteron-aal','x-zyteron-native-context','x-zyteron-native-signature'].includes(name))result[name]=value;});return result;}
