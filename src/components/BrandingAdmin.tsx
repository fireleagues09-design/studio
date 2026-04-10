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

        // 5MB Limit per user requirements
        if (file.size > 5 * 1024 * 1024) {
            toast({ 
                title: "File too large", 
                description: "The maximum favicon size is 5MB.", 
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
            
            // Force refresh token to ensure Storage permissions are up to date
            await user.getIdToken(true);

            // UNIQUE PATH STRATEGY: Bypasses CDN and Browser caches completely
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'png';
            const uniqueFileName = `icon_${timestamp}.${extension}`;
            
            // Files are stored in fav-icon/ folder as requested
            const storageRef = ref(storage, `fav-icon/${uniqueFileName}`);
            
            const metadata = {
                contentType: file.type || 'image/png', // CRITICAL: Sets the browser MIME type
                cacheControl: 'public,max-age=31536000',
            };

            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    console.error("Upload error:", error);
                    setIsUploading(false);
                    toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
                }, 
                async () => {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    const idToken = await user.getIdToken();
                    const result = await updateBrandingSettings({ faviconUrl: downloadUrl }, idToken);

                    if (result.success) {
                        setUploadSuccess(true);
                        toast({ 
                            title: "Success! ✅", 
                            description: "New website icon applied. It will update for all users immediately.",
                        });
                        setTimeout(() => {
                            setUploadSuccess(false);
                            setIsUploading(false);
                        }, 2500);
                    } else {
                        throw new Error(result.message);
                    }
                }
            );

        } catch (error: any) {
            console.error("Branding update error:", error);
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
                    Website Branding (Fav-icon)
                </CardTitle>
                <CardDescription>Upload a PNG, ICO or SVG to update the site tab icon instantly.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="space-y-2 shrink-0 text-center">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Icon</Label>
                        <div className="relative w-24 h-24 bg-background rounded-2xl border-2 border-muted flex items-center justify-center overflow-hidden shadow-inner mx-auto">
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
                            <h4 className="font-bold text-base">Cache-Busting Technology</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Our system generates unique versions for every upload. This forces the browser to bypass its local cache and display your new icon immediately across all devices.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                            />
                            <Button 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={isUploading}
                                className={cn(
                                    "rounded-xl h-11 px-6 font-bold shadow-lg transition-all min-w-[200px]",
                                    uploadSuccess ? "bg-green-600 hover:bg-green-700" : "shadow-primary/20"
                                )}
                            >
                                {isUploading ? (
                                    <span className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {Math.round(uploadProgress)}% Complete
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
