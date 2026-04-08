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
            console.log("🚀 Starting upload process to /images/favicon/...");
            
            // 1. Force a fresh ID token to ensure permissions are current
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required. Please re-login.");
            await user.getIdToken(true);

            // 2. Create storage reference inside the consolidated images folder
            const fileName = `favicon_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `images/favicon/${fileName}`);
            
            // 3. Perform the upload
            console.log("📤 Transferring bytes...");
            const snapshot = await uploadBytes(storageRef, file);
            console.log("✅ Bytes transferred successfully.");

            // 4. Get the public URL
            const downloadUrl = await getDownloadURL(snapshot.ref);
            console.log("🔗 URL Generated:", downloadUrl);
            
            // 5. Update Firestore via server action
            const idToken = await user.getIdToken();
            const result = await updateBrandingSettings({ faviconUrl: downloadUrl }, idToken);

            if (result.success) {
                setUploadSuccess(true);
                toast({ 
                    title: "Favicon Updated!", 
                    description: "Your new browser icon is now live.",
                });
                setTimeout(() => setUploadSuccess(false), 3000);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("❌ FAILED TO UPLOAD:", error);
            toast({ 
                title: "Upload Failed", 
                description: error.message || "The server rejected the upload. Check if Firebase Storage API is enabled in your Google Cloud Console.", 
                variant: "destructive" 
            });
        } finally {
            setIsUploading(false);
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
                <CardDescription>Upload an image directly to the 'images/favicon' folder.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="space-y-2 shrink-0">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Icon</Label>
                        <div className="relative w-24 h-24 bg-background rounded-2xl border-2 border-muted flex items-center justify-center overflow-hidden shadow-inner">
                            {faviconUrl ? (
                                <Image src={faviconUrl} alt="Favicon" fill className="object-contain p-3" unoptimized />
                            ) : (
                                <Globe className="h-8 w-8 text-muted-foreground/20" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                            <h4 className="font-bold text-base">Select and Upload</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Uploading an image here will save it to the consolidated 'images' directory and update your browser icon.
                            </p>
                        </div>

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
                                {isUploading ? 'Uploading...' : uploadSuccess ? 'Icon Saved!' : 'Upload New Icon'}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}