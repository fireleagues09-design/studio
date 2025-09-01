
"use client";

import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud } from "lucide-react";

export default function SliderAdmin() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleUpload() {
    if (!file) {
        toast({ title: "No File Selected", description: "Please select a file to upload.", variant: "destructive"});
        return;
    }
    try {
      setLoading(true);

      // Upload to storage
      const storageRef = ref(storage, `sliders/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Save to Firestore
      await addDoc(collection(db, "sliders"), {
        url,
        createdAt: new Date(),
      });

      setFile(null);
      // Clear the file input visually
      const fileInput = document.getElementById('slider-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({ title: "Success", description: "Slider image uploaded successfully!" });
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Upload Failed", description: "Please check the console for details.", variant: "destructive"});
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Manage Sliders</CardTitle>
            <CardDescription>Upload new images for the homepage slider gallery.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <Input
                id="slider-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full sm:w-auto flex-grow"
            />
            <Button
                onClick={handleUpload}
                disabled={loading}
                className="w-full sm:w-auto"
            >
                {loading ? "Uploading..." : <><UploadCloud className="mr-2 h-4 w-4"/> Upload Slider</>}
            </Button>
        </CardContent>
    </Card>
  );
}

    