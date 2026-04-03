import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
  petrol_price: number;
  diesel_price: number;
  pump_count_petrol: number;
  pump_count_diesel: number;
  default_expenses: string[];
  default_debtors: string[];
  cashier_group_count: number;
}

interface CompanyContextType {
  companyId: string | null;
  company: CompanySettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  companyId: null,
  company: null,
  loading: true,
  refetch: async () => {},
});

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCompany(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_my_company');
      if (error) {
        console.error('Error fetching company:', error);
        setCompany(null);
        setLoading(false);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const c = data[0];
        setCompany({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          contact_phone: c.contact_phone,
          petrol_price: Number(c.petrol_price),
          diesel_price: Number(c.diesel_price),
          pump_count_petrol: c.pump_count_petrol,
          pump_count_diesel: c.pump_count_diesel,
          default_expenses: (c.default_expenses as string[]) || [],
          default_debtors: (c.default_debtors as string[]) || [],
        });
      } else {
        setCompany(null);
      }
    } catch (err) {
      console.error('Error fetching company:', err);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchCompany();
      } else if (event === 'SIGNED_OUT') {
        setCompany(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <CompanyContext.Provider value={{
      companyId: company?.id || null,
      company,
      loading,
      refetch: fetchCompany,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
