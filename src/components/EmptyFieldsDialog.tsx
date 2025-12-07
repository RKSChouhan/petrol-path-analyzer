import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmptyFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emptyFields: string[];
  onSave: () => void;
}

const EmptyFieldsDialog = ({ open, onOpenChange, emptyFields, onSave }: EmptyFieldsDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>The following Data box are empty</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="mt-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground max-h-60 overflow-y-auto">
                {emptyFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>OK</AlertDialogCancel>
          <AlertDialogAction onClick={onSave}>Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EmptyFieldsDialog;
