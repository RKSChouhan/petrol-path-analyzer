import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesChartsProps {
  salesData: any[];
  onRefresh?: () => void;
}

const COLORS = {
  petrol: "hsl(var(--chart-1))",
  diesel: "hsl(var(--chart-2))",
  engineOil: "hsl(var(--chart-3))",
  lubricants: "hsl(var(--chart-4))",
};

const SalesCharts = ({ salesData, onRefresh }: SalesChartsProps) => {
  const { toast } = useToast();
  const sortedData = [...salesData].sort((a, b) => a.date.localeCompare(b.date));

  const handleDelete = async (date: string) => {
    try {
      const { error } = await supabase
        .from('daily_sales')
        .delete()
        .eq('sale_date', date);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales record deleted successfully",
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };
  
  const chartData = sortedData.slice(-30).map(item => ({
    date: format(parseISO(item.date), "dd MMM"),
    Petrol: item.petrol,
    Diesel: item.diesel,
    "Engine Oil": item.engineOil,
    Lubricants: item.lubricants,
    total: item.petrol + item.diesel + item.engineOil + item.lubricants,
  }));

  const productTotals = salesData.reduce(
    (acc, day) => ({
      petrol: acc.petrol + day.petrol,
      diesel: acc.diesel + day.diesel,
      engineOil: acc.engineOil + day.engineOil,
      lubricants: acc.lubricants + day.lubricants,
    }),
    { petrol: 0, diesel: 0, engineOil: 0, lubricants: 0 }
  );

  const pieData = [
    { name: "Petrol", value: productTotals.petrol },
    { name: "Diesel", value: productTotals.diesel },
    { name: "Engine Oil", value: productTotals.engineOil },
    { name: "Lubricants", value: productTotals.lubricants },
  ].filter(item => item.value > 0);

  if (salesData.length === 0) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No sales data recorded yet. Start by entering daily sales.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Sales Records</CardTitle>
          <CardDescription>View and manage daily sales entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Petrol</TableHead>
                  <TableHead className="text-right">Diesel</TableHead>
                  <TableHead className="text-right">Engine Oil</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(-10).reverse().map((sale) => (
                  <TableRow key={sale.date}>
                    <TableCell className="font-medium">{format(parseISO(sale.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">₹{sale.petrol.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.diesel.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.engineOil.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sale.date)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
          <CardDescription>Last 30 days revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar dataKey="Petrol" fill={COLORS.petrol} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Diesel" fill={COLORS.diesel} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Engine Oil" fill={COLORS.engineOil} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lubricants" fill={COLORS.lubricants} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Total Revenue Trend</CardTitle>
            <CardDescription>Combined daily sales over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Product Distribution</CardTitle>
            <CardDescription>Total revenue by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesCharts;
