import "server-only";
import { randomBytes } from "node:crypto";
import { getAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors";
import type { IdentityAdmin } from "../education/service";
type Identity = {id:string;email:string};
type Reply<T> = Promise<{data:T|null;error:unknown}>;
type AdminApi = {
  listUsers(input:{query:{filterField:string;filterOperator:string;filterValue:string;limit:number}}):Reply<{users:Identity[]}>;
  createUser(input:{email:string;name:string;password:string;role:"admin"|"user"}):Reply<{user:Identity}>;
  setRole(input:{userId:string;role:"admin"|"user"}):Reply<unknown>;
  banUser(input:{userId:string;banReason:string}):Reply<unknown>;
  unbanUser(input:{userId:string}):Reply<unknown>;
  revokeUserSessions(input:{userId:string}):Reply<unknown>;
};
// @neon/auth 0.8.2 exposes the admin server namespace as unknown; keep the
// documented wire contract isolated here, verified by the remote integration test.
function adminApi(){return getAuth().admin as AdminApi;}
export const identityAdmin:IdentityAdmin={
  async provision(email,name,admin){
    const auth={admin:adminApi()};
    const listed=await auth.admin.listUsers({query:{filterField:"email",filterOperator:"eq",filterValue:email,limit:2}});
    if(listed.error) throw new AppError("UNAVAILABLE","Не удалось проверить аккаунт Neon Auth.");
    const existing=listed.data?.users.find(user=>user.email.toLowerCase()===email);
    if(existing){const role=await auth.admin.setRole({userId:existing.id,role:admin?"admin":"user"});if(role.error)throw new AppError("UNAVAILABLE","Не удалось назначить права Auth.");return existing.id;}
    const result=await auth.admin.createUser({email,name,password:randomBytes(48).toString("base64url"),role:admin?"admin":"user"});
    if(result.error||!result.data?.user) throw new AppError("UNAVAILABLE","Не удалось создать аккаунт Neon Auth. Повторите запрос.");
    return result.data.user.id;
  },
  async update(userId,admin,active){
    const auth={admin:adminApi()};
    const role=await auth.admin.setRole({userId,role:admin?"admin":"user"});
    if(role.error)throw new AppError("UNAVAILABLE","Не удалось обновить права Auth.");
    const result=active?await auth.admin.unbanUser({userId}):await auth.admin.banUser({userId,banReason:"Доступ отключён администратором Engxam"});
    if(result.error)throw new AppError("UNAVAILABLE","Не удалось обновить доступ Auth.");
    if(!active){const revoked=await auth.admin.revokeUserSessions({userId});if(revoked.error)throw new AppError("UNAVAILABLE","Не удалось отозвать сессии Auth.");}
  },
};
