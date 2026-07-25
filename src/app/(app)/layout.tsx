import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible">
      <div className="hidden lg:block no-print">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:overflow-visible">
        <div className="no-print">
          <Topbar userName={session.user.name} role={session.user.role} />
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
