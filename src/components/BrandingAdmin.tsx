
'use client';

import { useState, useEffect, useRef } from 'react';
import { storage, auth, db } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
    const [uploadProgress, setUploadProgress] = useState(0);
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

        // 5MB Max Limit as requested
        if (file.size > 5 * 1024 * 1024) {
            toast({ 
                title: "Image too large", 
                description: "The maximum file size allowed is 5MB.", 
                variant: "destructive" 
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setUploadSuccess(false);
        setUploadProgress(0);
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required.");
            
            // Ensure we have a fresh token for storage rules
            await user.getIdToken(true);

            // Using the path specified in your required rules
            const storageRef = ref(storage, `fav-icon/favicon.png`);
            
            // Set metadata to help the browser identify the image type
            const metadata = {
                contentType: file.type || 'image/png',
            };

            // Start Resumable Upload Task for maximum reliability
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                    console.log(`Upload is ${Math.round(progress)}% done`);
                }, 
                (error) => {
                    console.error("Upload error:", error);
                    setIsUploading(false);
                    toast({ 
                        title: "Upload Failed", 
                        description: error.message, 
                        variant: "destructive" 
                    });
                }, 
                async () => {
                    // Finalize upload and get public download URL
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("File available at:", downloadUrl);
                    
                    // Update the global branding settings in Firestore
                    const idToken = await user.getIdToken();
                    const result = await updateBrandingSettings({ faviconUrl: downloadUrl }, idToken);

                    if (result.success) {
                        setUploadSuccess(true);
                        toast({ 
                            title: "Success!", 
                            description: "Browser icon updated. Changes will apply shortly.",
                        });
                        // Smooth reset of the upload button state
                        setTimeout(() => {
                            setUploadSuccess(false);
                            setIsUploading(false);
                        }, 3000);
                    } else {
                        throw new Error(result.message);
                    }
                }
            );

        } catch (error: any) {
            setIsUploading(false);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                <CardDescription>Upload an image to set your site's tab icon.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="space-y-2 shrink-0">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Icon</Label>
                        <div className="relative w-24 h-24 bg-background rounded-2xl border-2 border-muted flex items-center justify-center overflow-hidden shadow-inner">
                            {faviconUrl ? (
                                <Image 
                                    src={faviconUrl} 
                                    alt="Favicon" 
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
                            <h4 className="font-bold text-base">Select and Upload</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Upload a PNG, SVG, or ICO. Maximum size: 5MB.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                            />
                            <Button 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isUploading}
                                className={cn(
                                    "rounded-xl h-11 px-6 font-bold shadow-lg transition-all min-w-[180px]",
                                    uploadSuccess ? "bg-green-600 hover:bg-green-700" : "shadow-primary/20"
                                )}
                            >
                                {isUploading ? (
                                    <span className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : 'Syncing...'}
                                    </span>
                                ) : uploadSuccess ? (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                {!isUploading && (uploadSuccess ? 'Icon Applied!' : 'Upload New Icon')}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
