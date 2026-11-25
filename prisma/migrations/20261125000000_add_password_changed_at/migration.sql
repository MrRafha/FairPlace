-- Invalida sessões antigas após troca de senha (ver src/lib/auth.ts).
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
