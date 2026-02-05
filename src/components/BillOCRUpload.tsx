 import { useState, useRef } from "react";
 import { Button } from "@/components/ui/button";
 import { Camera, Upload, Loader2, X } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 
 interface BillOCRUploadProps {
   billType: "fiserv" | "bharat";
   onDataExtracted: (data: any) => void;
   disabled?: boolean;
 }
 
 const BillOCRUpload = ({ billType, onDataExtracted, disabled }: BillOCRUploadProps) => {
   const { toast } = useToast();
   const [isProcessing, setIsProcessing] = useState(false);
   const [previewImage, setPreviewImage] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file) return;
 
     if (!file.type.startsWith('image/')) {
       toast({
         title: "Invalid file",
         description: "Please select an image file",
         variant: "destructive",
       });
       return;
     }
 
     if (file.size > 10 * 1024 * 1024) {
       toast({
         title: "File too large",
         description: "Please select an image smaller than 10MB",
         variant: "destructive",
       });
       return;
     }
 
     const reader = new FileReader();
     reader.onload = async (e) => {
       const base64 = e.target?.result as string;
       setPreviewImage(base64);
       await processImage(base64);
     };
     reader.readAsDataURL(file);
 
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
   };
 
   const processImage = async (imageBase64: string) => {
     setIsProcessing(true);
 
     try {
       const { data, error } = await supabase.functions.invoke('ocr-bill', {
         body: { imageBase64, billType }
       });
 
       if (error) {
         throw new Error(error.message || "Failed to process image");
       }
 
       if (data.error) {
         throw new Error(data.error);
       }
 
       if (data.success && data.data) {
         onDataExtracted(data.data);
         toast({
           title: "Data extracted",
           description: "Bill data has been extracted successfully",
         });
       } else {
         toast({
           title: "No data found",
           description: "Could not extract data from the image",
           variant: "destructive",
         });
       }
     } catch (error) {
       console.error('OCR error:', error);
       toast({
         title: "Processing failed",
         description: error instanceof Error ? error.message : "Failed to process image",
         variant: "destructive",
       });
     } finally {
       setIsProcessing(false);
     }
   };
 
   const clearImage = () => {
     setPreviewImage(null);
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
   };
 
   return (
     <div className="flex items-center gap-2">
       <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         capture="environment"
         onChange={handleFileSelect}
         className="hidden"
         disabled={disabled || isProcessing}
       />
       
       {previewImage ? (
         <div className="flex items-center gap-2">
           <div className="relative h-8 w-8">
             <img 
               src={previewImage} 
               alt="Preview" 
               className="h-8 w-8 object-cover rounded"
             />
             {isProcessing && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                 <Loader2 className="h-4 w-4 animate-spin text-white" />
               </div>
             )}
           </div>
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8"
             onClick={clearImage}
             disabled={isProcessing}
           >
             <X className="h-4 w-4" />
           </Button>
         </div>
       ) : (
         <Button
           variant="outline"
           size="sm"
           onClick={() => fileInputRef.current?.click()}
           disabled={disabled || isProcessing}
         >
           {isProcessing ? (
             <Loader2 className="h-4 w-4 mr-1 animate-spin" />
           ) : (
             <Camera className="h-4 w-4 mr-1" />
           )}
           Scan Bill
         </Button>
       )}
     </div>
   );
 };
 
 export default BillOCRUpload;