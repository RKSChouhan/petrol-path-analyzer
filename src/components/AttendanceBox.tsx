import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AttendanceEntry {
  name: string;
  shift: string;
  job: string;
}

interface AttendanceBoxProps {
  userId: string;
  dailySalesId?: string | null;
  disabled?: boolean;
  selectedAttendance: AttendanceEntry[];
  onAttendanceChange: (attendance: AttendanceEntry[]) => void;
}

const SHIFT_OPTIONS = ["Full", "Day", "Night"];
const JOB_OPTIONS = ["Supervisor", "Cashier", "Pump boy", "Cleaner", "Air boy"];

const AttendanceBox = ({ userId, dailySalesId, disabled, selectedAttendance, onAttendanceChange }: AttendanceBoxProps) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<{ id: string; name: string; default_shift: string; default_job: string }[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [userId]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, default_shift, default_job')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }

    setEmployees(data || []);
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an employee name",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('employees')
      .insert({
        name: newEmployeeName.trim(),
        user_id: userId,
        default_shift: 'Full',
        default_job: 'Pump boy',
      });

    if (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `${newEmployeeName} added to employees`,
    });

    setNewEmployeeName("");
    setIsAdding(false);
    fetchEmployees();
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: `${name} removed from employees`,
    });

    // Remove from selected attendance if present
    onAttendanceChange(selectedAttendance.filter(a => a.name !== name));
    fetchEmployees();
  };

  const isEmployeeSelected = (employeeName: string) => {
    return selectedAttendance.some(a => a.name === employeeName);
  };

  const getEmployeeAttendance = (employeeName: string): AttendanceEntry | undefined => {
    return selectedAttendance.find(a => a.name === employeeName);
  };

  const toggleEmployeeAttendance = (employee: { name: string; default_shift: string; default_job: string }) => {
    if (disabled) return;
    
    if (isEmployeeSelected(employee.name)) {
      onAttendanceChange(selectedAttendance.filter(a => a.name !== employee.name));
    } else {
      onAttendanceChange([...selectedAttendance, {
        name: employee.name,
        shift: employee.default_shift || 'Full',
        job: employee.default_job || 'Pump boy',
      }]);
    }
  };

  const updateEmployeeShift = (employeeName: string, shift: string) => {
    if (disabled) return;
    onAttendanceChange(selectedAttendance.map(a => 
      a.name === employeeName ? { ...a, shift } : a
    ));
  };

  const updateEmployeeJob = (employeeName: string, job: string) => {
    if (disabled) return;
    onAttendanceChange(selectedAttendance.map(a => 
      a.name === employeeName ? { ...a, job } : a
    ));
  };

  const selectAll = () => {
    if (disabled) return;
    onAttendanceChange(employees.map(e => ({
      name: e.name,
      shift: e.default_shift || 'Full',
      job: e.default_job || 'Pump boy',
    })));
  };

  const clearAll = () => {
    if (disabled) return;
    onAttendanceChange([]);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
        <Users className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="flex-1"
            disabled={disabled}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {isAdding && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Employee name"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEmployee()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddEmployee}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewEmployeeName(""); }}>Cancel</Button>
          </div>
        )}

        {/* Select All / Clear buttons */}
        {employees.length > 0 && (
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={selectAll} disabled={disabled} className="text-xs h-7">
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={clearAll} disabled={disabled} className="text-xs h-7">
              Clear All
            </Button>
          </div>
        )}

        {/* Table Header */}
        {employees.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/80 rounded-t-md border-b text-xs font-semibold text-muted-foreground">
            <div className="w-6"></div>
            <div className="flex-1 min-w-[100px]">Employee Name</div>
            <div className="w-24 text-center">Shift</div>
            <div className="w-28 text-center">Job</div>
            <div className="w-6"></div>
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No employees added yet</p>
          ) : (
            <div className="space-y-1">
              {employees.map((employee, index) => {
                const isSelected = isEmployeeSelected(employee.name);
                const attendance = getEmployeeAttendance(employee.name);
                
                return (
                  <div
                    key={employee.id}
                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      id={`attendance-${employee.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleEmployeeAttendance(employee)}
                      disabled={disabled}
                    />
                    <label 
                      htmlFor={`attendance-${employee.id}`}
                      className="flex-1 min-w-[100px] text-sm font-medium cursor-pointer truncate"
                    >
                      {index + 1}. {employee.name}
                    </label>
                    
                    {/* Shift Dropdown */}
                    <Select
                      value={attendance?.shift || employee.default_shift || 'Full'}
                      onValueChange={(value) => updateEmployeeShift(employee.name, value)}
                      disabled={disabled || !isSelected}
                    >
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue placeholder="Shift" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {SHIFT_OPTIONS.map(shift => (
                          <SelectItem key={shift} value={shift} className="text-xs">
                            {shift}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Job Dropdown */}
                    <Select
                      value={attendance?.job || employee.default_job || 'Pump boy'}
                      onValueChange={(value) => updateEmployeeJob(employee.name, value)}
                      disabled={disabled || !isSelected}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue placeholder="Job" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {JOB_OPTIONS.map(job => (
                          <SelectItem key={job} value={job} className="text-xs">
                            {job}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Present: {selectedAttendance.length} / {employees.length} employees
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceBox;
