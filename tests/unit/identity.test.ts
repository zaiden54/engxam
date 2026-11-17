import { describe,it,expect } from "vitest";
import { canReadEnrollment,requireRole,type Actor } from "../../src/modules/identity/policy";
import { commandSchema } from "../../src/modules/education/schemas";
const actor:Actor={id:"student",authId:"auth",email:"a@example.com",fullName:"A",role:"student",active:true,version:1};
describe("identity boundaries",()=>{
 it("denies other students and former teachers",()=>{expect(canReadEnrollment(actor,{studentId:"other",teacherId:"t"})).toBe(false);expect(canReadEnrollment({...actor,role:"teacher",id:"old"},{studentId:"s",teacherId:"new"})).toBe(false);});
 it("denies inactive accounts",()=>expect(canReadEnrollment({...actor,active:false},{studentId:"student",teacherId:"t"})).toBe(false));
 it("requires admin for administration",()=>expect(()=>requireRole(actor,"admin")).toThrow());
 it("rejects forbidden fields in student profile",()=>expect(commandSchema.safeParse({operation:"updateProfile",id:"37e37042-de0e-4d59-98c0-30759e2b90aa",version:1,dissertationTopic:"",supervisorName:"",role:"admin"}).success).toBe(false));
});
