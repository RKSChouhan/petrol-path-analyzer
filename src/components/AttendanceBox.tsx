import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AttendanceBoxProps {
  userId: string;
}

const AttendanceBox = ({ userId }: AttendanceBoxProps) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [userId]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name')
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

    fetchEmployees();
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
            onClick={() => setIsAdding(true)}
            className="flex-1"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add New Employee
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

        <div className="max-h-[300px] overflow-y-auto">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No employees added yet</p>
          ) : (
            <div className="space-y-2">
              {employees.map((employee, index) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-6">{index + 1}.</span>
                    <span className="text-sm font-medium">{employee.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">Total: {employees.length} employees</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceBox;
