import fs from "fs-extra";
import path from "path";

export async function detectDatabase(
  projectPath: string
): Promise<{ orm: string | null; provider: string | null; migrations: string | null }> {
  const result = { orm: null as string | null, provider: null as string | null, migrations: null as string | null };

  // Check for Prisma
  const prismaSchemaPath = path.join(projectPath, "prisma", "schema.prisma");
  if (await fs.pathExists(prismaSchemaPath)) {
    result.orm = "prisma";
    result.migrations = "prisma";
    try {
      const schema = await fs.readFile(prismaSchemaPath, "utf-8");
      if (schema.includes('provider = "postgresql"') || schema.includes('provider = "postgres"')) {
        result.provider = "postgresql";
      } else if (schema.includes('provider = "mysql"')) {
        result.provider = "mysql";
      } else if (schema.includes('provider = "sqlite"')) {
        result.provider = "sqlite";
      } else if (schema.includes('provider = "mongodb"')) {
        result.provider = "mongodb";
      }
    } catch {}
    return result;
  }

  // Check package.json deps for JS/TS ORMs
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.drizzle) {
        result.orm = "drizzle";
        result.migrations = "drizzle-kit";
        if (deps.pg || deps.postgres) result.provider = "postgresql";
        if (deps.mysql2) result.provider = "mysql";
        if (deps["better-sqlite3"]) result.provider = "sqlite";
        return result;
      }

      if (deps.typeorm) {
        result.orm = "typeorm";
        result.migrations = "typeorm";
        if (deps.pg) result.provider = "postgresql";
        if (deps.mysql2) result.provider = "mysql";
        return result;
      }

      if (deps.knex) {
        result.orm = "knex";
        result.migrations = "knex";
        if (deps.pg) result.provider = "postgresql";
        if (deps.mysql2) result.provider = "mysql";
        return result;
      }

      if (deps.sequelize) {
        result.orm = "sequelize";
        result.migrations = "sequelize";
        if (deps.pg) result.provider = "postgresql";
        if (deps.mysql2) result.provider = "mysql";
        return result;
      }

      if (deps.mongoose) {
        result.orm = "mongoose";
        result.provider = "mongodb";
        return result;
      }

      // Raw database drivers
      if (deps.pg || deps.postgres) { result.provider = "postgresql"; return result; }
      if (deps.mysql2) { result.provider = "mysql"; return result; }
      if (deps["better-sqlite3"]) { result.provider = "sqlite"; return result; }
    } catch {}
  }

  // Check pyproject.toml for Python ORMs
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fs.pathExists(pyprojectPath)) {
    try {
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("sqlalchemy")) {
        result.orm = "sqlalchemy";
        if (content.includes("alembic")) result.migrations = "alembic";
        if (content.includes("psycopg") || content.includes("asyncpg")) result.provider = "postgresql";
        return result;
      }
      if (content.includes("tortoise")) {
        result.orm = "tortoise-orm";
        return result;
      }
      if (content.includes("django")) {
        result.orm = "django-orm";
        result.migrations = "django";
        return result;
      }
    } catch {}
  }

  return result;
}
