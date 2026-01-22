import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, LogOut, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface AttendanceRecord {
  id: string;
  employee_name: string;
  shift: string | null;
  job: string | null;
  created_at: string;
  daily_sales_id: string | null;
  sale_date?: string;
  entry_number?: number;
}

const Attendance = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem("userRole");
      supabase.auth.signOut();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const role = sessionStorage.getItem("userRole");
      if (!role) {
        navigate("/login");
      } else {
        setUserRole(role);
      }
    };

    checkAuth();
    fetchAttendanceRecords();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem("userRole");
        navigate("/login");
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select(`
          id,
          employee_name,
          shift,
          job,
          created_at,
          daily_sales_id,
          daily_sales (
            sale_date,
            entry_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const records: AttendanceRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        employee_name: record.employee_name,
        shift: record.shift,
        job: record.job,
        created_at: record.created_at,
        daily_sales_id: record.daily_sales_id,
        sale_date: record.daily_sales?.sale_date,
        entry_number: record.daily_sales?.entry_number,
      }));

      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToShortcut = () => {
    navigate("/shortcut");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
                <p className="text-sm text-muted-foreground">Employee attendance records</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGoToShortcut}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Shortcut
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading attendance records...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No attendance records found.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Attendance records will appear here when submitted from Daily Entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Job</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {record.sale_date 
                              ? format(new Date(record.sale_date), 'dd MMM yyyy')
                              : format(new Date(record.created_at), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.entry_number ? `Entry ${record.entry_number}` : '-'}
                        </TableCell>
                        <TableCell>{record.employee_name}</TableCell>
                        <TableCell>{record.shift || '-'}</TableCell>
                        <TableCell>{record.job || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Attendance;
