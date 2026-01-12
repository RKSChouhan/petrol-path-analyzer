import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageOCRUploadProps {
  onDataExtracted: (data: any) => void;
  disabled?: boolean;
}

const ImageOCRUpload = ({ onDataExtracted, disabled }: ImageOCRUploadProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ocr-image', {
        body: { imageBase64: base64Image }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.data) {
        onDataExtracted(data.data);
        toast({
          title: "Data extracted",
          description: "Image data has been extracted and applied to the form",
        });
      } else {
        toast({
          title: "No data found",
          description: "Could not extract any data from the image",
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
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isProcessing}
        />
        
        {previewImage ? (
          <div className="relative">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-32 object-cover rounded-md"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={clearImage}
              disabled={isProcessing}
            >
              <X className="h-3 w-3" />
            </Button>
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">Upload image for data entry</span>
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Upload a photo of sales data to auto-fill the form
        </p>
      </CardContent>
    </Card>
  );
};

export default ImageOCRUpload;
