import {randomUUID} from "node:crypto";
import type {NextRequest} from "next/server";
import {AppError,publicError} from "./errors";
import {ZodError} from "zod";
export function apiFailure(error:unknown){if(error instanceof ZodError||error instanceof SyntaxError)error=new AppError("VALIDATION_ERROR","Проверьте параметры запроса.");const status=error instanceof AppError?({UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,VALIDATION_ERROR:400,UNAVAILABLE:503}[error.code]):503;return Response.json(publicError(error,randomUUID()),{status,headers:{"Cache-Control":"no-store"}});}
export function requireSameOrigin(request:NextRequest){if(request.headers.get("origin")!==request.nextUrl.origin)throw new AppError("FORBIDDEN","Недопустимый источник запроса.");}
