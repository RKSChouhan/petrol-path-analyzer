import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { LayoutGrid, LogOut, Users, Calendar, ChevronDown, ChevronRight, Trash2, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DateRangeExportControls from "@/components/DateRangeExportControls";

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

interface GroupedByDate {
  date: string;
  dayName: string;
  records: AttendanceRecord[];
}

interface GroupedByMonth {
  month: string;
  monthLabel: string;
  dates: GroupedByDate[];
}

const Attendance = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [groupedData, setGroupedData] = useState<GroupedByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>();
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>();

  const companyName = company?.name || "Sales Tracker";
  const companyLogo = company?.logo_url || logo;

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
        .order('created_at', { ascending: false });

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

      // Group by month and date
      const grouped = groupRecordsByMonthAndDate(records);
      setGroupedData(grouped);

      // Auto-expand the first month and its first date
      if (grouped.length > 0) {
        setExpandedMonths(new Set([grouped[0].month]));
        if (grouped[0].dates.length > 0) {
          setExpandedDates(new Set([`${grouped[0].month}-${grouped[0].dates[0].date}`]));
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupRecordsByMonthAndDate = (records: AttendanceRecord[]): GroupedByMonth[] => {
    const monthMap = new Map<string, Map<string, AttendanceRecord[]>>();

    records.forEach(record => {
      const dateStr = record.sale_date || record.created_at.split('T')[0];
      const date = parseISO(dateStr);
      const monthKey = format(date, 'yyyy-MM');
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }
      const dateMap = monthMap.get(monthKey)!;
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(record);
    });

    const result: GroupedByMonth[] = [];
    
    // Sort months descending
    const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(monthKey => {
      const dateMap = monthMap.get(monthKey)!;
      const dates: GroupedByDate[] = [];
      
      // Sort dates descending
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
      
      sortedDates.forEach(dateKey => {
        const dateObj = parseISO(dateKey);
        dates.push({
          date: dateKey,
          dayName: format(dateObj, 'EEEE'),
          records: dateMap.get(dateKey)!,
        });
      });

      const monthDate = parseISO(`${monthKey}-01`);
      result.push({
        month: monthKey,
        monthLabel: format(monthDate, 'MMMM yyyy'),
        dates,
      });
    });

    return result;
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const toggleDate = (month: string, date: string) => {
    const key = `${month}-${date}`;
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDeleteAttendance = async (id: string) => {
    if (userRole !== 'Proprietor') {
      toast.error("Only Proprietor can delete attendance records");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('daily_attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Attendance record deleted");
      fetchAttendanceRecords();
    } catch (error: any) {
      console.error('Error deleting attendance:', error);
      toast.error(error.message || "Failed to delete attendance record");
    }
  };

  const handleDeleteMonth = async (month: string) => {
    if (userRole !== 'Proprietor') {
      toast.error("Only Proprietor can delete attendance records");
      return;
    }
    
    // Get all record IDs for this month
    const monthGroup = groupedData.find(g => g.month === month);
    if (!monthGroup) return;
    
    const recordIds = monthGroup.dates.flatMap(d => d.records.map(r => r.id));
    
    if (recordIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('daily_attendance')
        .delete()
        .in('id', recordIds);

      if (error) throw error;
      toast.success(`Deleted ${recordIds.length} attendance records for ${monthGroup.monthLabel}`);
      fetchAttendanceRecords();
    } catch (error: any) {
      console.error('Error deleting month attendance:', error);
      toast.error(error.message || "Failed to delete attendance records");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleExportAttendance = () => {
    if (groupedData.length === 0) return;

    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      toast.error("From date must be before To date");
      return;
    }

    const filteredRows = groupedData.flatMap((monthGroup) =>
      monthGroup.dates.flatMap((dateGroup) => {
        const currentDate = parseISO(dateGroup.date);
        const withinRange =
          (!exportStartDate || currentDate >= exportStartDate) &&
          (!exportEndDate || currentDate <= exportEndDate);

        if (!withinRange) return [];

        return dateGroup.records.map((record) => ({
          date: dateGroup.date,
          dayName: dateGroup.dayName,
          record,
        }));
      })
    );

    if (filteredRows.length === 0) {
      toast.error("No attendance records found in the selected range");
      return;
    }

    const wb = XLSX.utils.book_new();
    const sheetData: any[][] = [
      ['Attendance Records Export'],
      [],
      ['Date', 'Day', 'Employee Name', 'Shift', 'Job', 'Entry Number'],
    ];

    filteredRows.forEach(({ date, dayName, record }) => {
      sheetData.push([
        format(parseISO(date), 'dd MMM yyyy'),
        dayName,
        record.employee_name,
        record.shift || 'Full',
        record.job || 'Pump boy',
        record.entry_number || '-',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    XLSX.writeFile(wb, `Attendance_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Attendance exported to Excel");
  };

  const handleGoToShortcut = () => {
    navigate("/shortcut");
  };

  const isProprietor = userRole === 'Proprietor';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
                <p className="text-sm text-muted-foreground">Employee attendance records</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportAttendance} disabled={groupedData.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
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
        <div className="mb-6">
          <DateRangeExportControls
            startDate={exportStartDate}
            endDate={exportEndDate}
            onStartDateChange={setExportStartDate}
            onEndDateChange={setExportEndDate}
            onExport={handleExportAttendance}
            disabled={groupedData.length === 0}
          />
        </div>
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
            ) : groupedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No attendance records found.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Attendance records will appear here when submitted from Daily Entry.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedData.map((monthGroup) => (
                  <Card key={monthGroup.month} className="border-2">
                    <Collapsible
                      open={expandedMonths.has(monthGroup.month)}
                      onOpenChange={() => toggleMonth(monthGroup.month)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center justify-between w-full">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              {expandedMonths.has(monthGroup.month) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                              <Calendar className="h-5 w-5 text-primary" />
                              {monthGroup.monthLabel}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({monthGroup.dates.reduce((sum, d) => sum + d.records.length, 0)} records)
                              </span>
                            </CardTitle>
                            {isProprietor && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMonth(monthGroup.month);
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {monthGroup.dates.map((dateGroup) => (
                            <Card key={dateGroup.date} className="border">
                              <Collapsible
                                open={expandedDates.has(`${monthGroup.month}-${dateGroup.date}`)}
                                onOpenChange={() => toggleDate(monthGroup.month, dateGroup.date)}
                              >
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-2 px-4">
                                    <div className="flex items-center gap-2 text-base">
                                      {expandedDates.has(`${monthGroup.month}-${dateGroup.date}`) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      <span className="font-semibold">
                                        {format(parseISO(dateGroup.date), 'dd MMM yyyy')}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ({dateGroup.dayName})
                                      </span>
                                      <span className="text-sm text-muted-foreground ml-auto">
                                        {dateGroup.records.length} employee{dateGroup.records.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <CardContent className="pt-0 pb-3 px-4">
                                    <div className="grid gap-2">
                                      {dateGroup.records.map((record) => (
                                        <div
                                          key={record.id}
                                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                          <div className="flex items-center gap-4">
                                            <div className="font-medium">{record.employee_name}</div>
                                            {record.entry_number && (
                                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                Entry {record.entry_number}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="bg-background px-2 py-1 rounded">
                                              {record.shift || 'Full'}
                                            </span>
                                            <span className="bg-background px-2 py-1 rounded">
                                              {record.job || 'Pump boy'}
                                            </span>
                                            {isProprietor && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteAttendance(record.id);
                                                }}
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Attendance;
