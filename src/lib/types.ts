import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "VENDEDOR" | "LEAD_MANAGER" | "COORDINADOR";
    };
  }
}
