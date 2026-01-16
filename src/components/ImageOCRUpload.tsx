import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageOCRUploadProps {
  onDataExtracted: (data: any) => void;
  disabled?: boolean;
}

const MAX_IMAGES = 5;

const ImageOCRUpload = ({ onDataExtracted, disabled }: ImageOCRUploadProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - previewImages.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: `You can only upload up to ${MAX_IMAGES} images`,
        variant: "destructive",
      });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setPreviewImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAllImages = async () => {
    if (previewImages.length === 0) return;

    setIsProcessing(true);
    const allExtractedData: any[] = [];

    try {
      for (let i = 0; i < previewImages.length; i++) {
        toast({
          title: "Processing...",
          description: `Processing image ${i + 1} of ${previewImages.length}`,
        });

        const { data, error } = await supabase.functions.invoke('ocr-image', {
          body: { imageBase64: previewImages[i] }
        });

        if (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          continue;
        }

        if (data.error) {
          console.error(`Error in response for image ${i + 1}:`, data.error);
          continue;
        }

        if (data.success && data.data) {
          allExtractedData.push(data.data);
        }
      }

      if (allExtractedData.length > 0) {
        // Merge all extracted data
        const mergedData = mergeExtractedData(allExtractedData);
        onDataExtracted(mergedData);
        toast({
          title: "Data extracted",
          description: `Successfully processed ${allExtractedData.length} image(s)`,
        });
      } else {
        toast({
          title: "No data found",
          description: "Could not extract any data from the images",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process images",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeExtractedData = (dataArray: any[]) => {
    if (dataArray.length === 1) return dataArray[0];

    // Merge multiple extracted data objects
    const merged: any = {};

    for (const data of dataArray) {
      // Merge pump readings (take non-zero values)
      if (data.pumpReadings) {
        if (!merged.pumpReadings) merged.pumpReadings = {};
        for (const key of Object.keys(data.pumpReadings)) {
          if (!merged.pumpReadings[key] || 
              (data.pumpReadings[key].closing_reading > 0 && merged.pumpReadings[key].closing_reading === 0)) {
            merged.pumpReadings[key] = data.pumpReadings[key];
          }
        }
      }

      // Merge payment methods (sum values)
      if (data.paymentMethods) {
        if (!merged.paymentMethods) merged.paymentMethods = {};
        for (const group of Object.keys(data.paymentMethods)) {
          if (!merged.paymentMethods[group]) {
            merged.paymentMethods[group] = { ...data.paymentMethods[group] };
          } else {
            for (const key of Object.keys(data.paymentMethods[group])) {
              merged.paymentMethods[group][key] = (merged.paymentMethods[group][key] || 0) + (data.paymentMethods[group][key] || 0);
            }
          }
        }
      }

      // Merge cash denominations (sum values)
      if (data.cashDenominations) {
        if (!merged.cashDenominations) merged.cashDenominations = {};
        for (const group of Object.keys(data.cashDenominations)) {
          if (!merged.cashDenominations[group]) {
            merged.cashDenominations[group] = { ...data.cashDenominations[group] };
          } else {
            for (const key of Object.keys(data.cashDenominations[group])) {
              merged.cashDenominations[group][key] = (merged.cashDenominations[group][key] || 0) + (data.cashDenominations[group][key] || 0);
            }
          }
        }
      }

      // Merge oil sales
      if (data.oilSales) {
        if (!merged.oilSales) {
          merged.oilSales = { ...data.oilSales };
        } else {
          // Merge items array
          if (data.oilSales.items) {
            if (!merged.oilSales.items) merged.oilSales.items = [];
            merged.oilSales.items = [...merged.oilSales.items, ...data.oilSales.items];
          }
          // Take non-zero values for other fields
          for (const key of ['yesterday_reading', 'today_reading', 'total_litres', 'total_amount', 'distilled_water_count', 'distilled_water', 'waste']) {
            if (data.oilSales[key] && (!merged.oilSales[key] || merged.oilSales[key] === 0)) {
              merged.oilSales[key] = data.oilSales[key];
            }
          }
        }
      }

      // Merge expenses (concat arrays)
      if (data.expenses) {
        if (!merged.expenses) merged.expenses = [];
        merged.expenses = [...merged.expenses, ...data.expenses];
      }

      // Merge debtors (concat arrays)
      if (data.debtors) {
        if (!merged.debtors) merged.debtors = [];
        merged.debtors = [...merged.debtors, ...data.debtors];
      }
    }

    return merged;
  };

  const removeImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setPreviewImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Image Data Entry</CardTitle>
        <Camera className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isProcessing}
        />
        
        {previewImages.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {previewImages.map((img, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={img} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5"
                    onClick={() => removeImage(index)}
                    disabled={isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {previewImages.length < MAX_IMAGES && (
                <Button
                  variant="outline"
                  className="aspect-square flex flex-col gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isProcessing}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Add</span>
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={processAllImages}
                disabled={disabled || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process {previewImages.length} Image{previewImages.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearAllImages}
                disabled={isProcessing}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">Upload up to {MAX_IMAGES} images</span>
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {previewImages.length}/{MAX_IMAGES} images selected
        </p>
      </CardContent>
    </Card>
  );
};

export default ImageOCRUpload;