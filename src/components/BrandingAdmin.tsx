
'use client';

import { useState, useEffect, useRef } from 'react';
import { storage, auth, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Globe, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { updateBrandingSettings } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

export default function BrandingAdmin() {
    const [faviconUrl, setFaviconUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'branding'), (doc) => {
            if (doc.exists()) {
                setFaviconUrl(doc.data().faviconUrl || '');
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to branding:", error);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setUploadSuccess(false);
        
        try {
            console.log("--- Starting Favicon Upload Process ---");
            console.log("File:", file.name, "Size:", (file.size / 1024).toFixed(2), "KB");
            
            const user = auth.currentUser;
            if (!user) {
                throw new Error("You must be logged in to perform this action.");
            }

            // 1. Create a unique path in the 'fav-icon' folder
            const fileName = `favicon_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `fav-icon/${fileName}`);
            
            console.log("Storage Path:", storageRef.fullPath);

            // 2. Perform the actual data transfer
            // We use uploadBytes directly as it's the most reliable for small files
            console.log("Initiating data transfer to Firebase Storage...");
            const snapshot = await uploadBytes(storageRef, file);
            console.log("Data transfer COMPLETE ✅");

            // 3. Retrieve the permanent URL
            console.log("Fetching download URL...");
            const downloadUrl = await getDownloadURL(snapshot.ref);
            console.log("Generated URL:", downloadUrl);

            // 4. Force token refresh to ensure admin claims are current for the server action
            console.log("Syncing authentication state...");
            const idToken = await user.getIdToken(true);

            // 5. Update the site settings in Firestore via secure action
            console.log("Updating database records...");
            const result = await updateBrandingSettings({ faviconUrl: downloadUrl }, idToken);

            if (result.success) {
                console.log("Database update COMPLETE ✅");
                setUploadSuccess(true);
                toast({ 
                    title: "Brand Updated ✅", 
                    description: "Your new favicon is now live for all users.",
                });
                // Success feedback timeout
                setTimeout(() => setUploadSuccess(false), 5000);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("--- UPLOAD FAILED ---");
            console.error("Error details:", error);
            
            let userMessage = "Upload failed. ";
            if (error.code === 'storage/unauthorized') {
                userMessage += "Permission denied by storage rules.";
            } else if (error.code === 'storage/retry-limit-exceeded') {
                userMessage += "Network timeout. Please check your connection.";
            } else {
                userMessage += error.message || "An unknown error occurred.";
            }

            toast({ 
                title: "Upload Error ❌", 
                description: userMessage, 
                variant: "destructive" 
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            console.log("--- End of Process ---");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-secondary/20 rounded-2xl border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card className="border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Browser Identity (Favicon)
                </CardTitle>
                <CardDescription>Directly upload an image to your Firebase Storage 'fav-icon' folder.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="space-y-2 shrink-0">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Icon</Label>
                            <div className="relative w-24 h-24 bg-background rounded-2xl border-2 border-muted flex items-center justify-center overflow-hidden shadow-inner">
                                {faviconUrl ? (
                                    <Image 
                                        src={faviconUrl} 
                                        alt="Current Favicon" 
                                        fill 
                                        className="object-contain p-3" 
                                        unoptimized
                                    />
                                ) : (
                                    <Globe className="h-8 w-8 text-muted-foreground/20" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                                <h4 className="font-bold text-base">Select Image</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Files are uploaded directly to the <code className="bg-muted px-1 rounded">fav-icon/</code> directory in your storage bucket.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                    />
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={isUploading}
                                        className={cn(
                                            "rounded-xl h-11 px-6 font-bold shadow-lg transition-all",
                                            uploadSuccess ? "bg-green-600 hover:bg-green-700" : "shadow-primary/20"
                                        )}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : uploadSuccess ? (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        ) : (
                                            <Upload className="h-4 w-4 mr-2" />
                                        )}
                                        {isUploading ? 'Uploading Data...' : uploadSuccess ? 'Success!' : 'Upload New Icon'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-dashed text-center">
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                        CORS and security rules have been optimized for instant authenticated writes.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
