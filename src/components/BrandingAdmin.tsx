'use client';

import { useState, useEffect, useRef } from 'react';
import { storage, auth, db } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Globe, CheckCircle, Code2, Copy, Terminal } from 'lucide-react';
import Image from 'next/image';
import { updateBrandingSettings } from '@/app/admin/actions';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FAVICON_SYSTEM_CODE = `
// ==========================================
// 1. FIREBASE STORAGE RULES
// ==========================================
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /fav-icon/{allPaths=**} {
      allow read, write: if true;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}

// ==========================================
// 2. DYNAMIC FAVICON INJECTOR (Client Component)
// Location: src/components/DynamicFavicon.tsx
// ==========================================
'use client';
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function DynamicFavicon() {
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.faviconUrl) applyFavicon(data.faviconUrl);
      }
    });
    return () => unsub();
  }, []);

  const applyFavicon = (url: string) => {
    if (typeof window === 'undefined') return;
    const selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];
    selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
    const bustedUrl = \`\${url}\${url.includes('?') ? '&' : '?'}v=\${Date.now()}\`;
    const tags = [
      { rel: 'icon', href: bustedUrl, type: 'image/png', sizes: '32x32' },
      { rel: 'shortcut icon', href: bustedUrl },
      { rel: 'apple-touch-icon', href: bustedUrl, sizes: '180x180' }
    ];
    const head = document.getElementsByTagName('head')[0];
    if (!head) return;
    tags.forEach(t => {
      const link = document.createElement('link');
      Object.entries(t).forEach(([k, v]) => link.setAttribute(k, v));
      head.appendChild(link);
    });
  };
  return null;
}

// ==========================================
// 3. ADMIN UPLOAD LOGIC
// Location: src/components/BrandingAdmin.tsx
// ==========================================
// Uses uploadBytesResumable for reliability
// Generates unique filenames to bypass CDN cache
// Updates Firestore settings/branding/faviconUrl
`;

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

    const handleCopyCode = () => {
        navigator.clipboard.writeText(FAVICON_SYSTEM_CODE.trim());
        toast({
            title: "Code Copied!",
            description: "Favicon system implementation is now in your clipboard.",
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            
            await user.getIdToken(true);

            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'png';
            const uniqueFileName = `icon_${timestamp}.${extension}`;
            const storageRef = ref(storage, `fav-icon/${uniqueFileName}`);
            
            const metadata = {
                contentType: file.type || 'image/png',
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
                            description: "New website icon applied instantly.",
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
            <CardHeader className="bg-secondary/10 border-b flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Website Branding (Fav-icon)
                    </CardTitle>
                    <CardDescription>Upload PNG or ICO to update the site tab icon instantly.</CardDescription>
                </div>
                
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-full bg-background/50 hover:bg-background h-8 px-3 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">
                            <Code2 className="h-3 w-3 mr-1.5" />
                            Source Code
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-primary" />
                                Favicon System Implementation
                            </DialogTitle>
                            <DialogDescription>
                                Copy the full logic used to handle dynamic icon injection, cache-busting, and storage rules.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 min-h-0 mt-4 border rounded-xl bg-zinc-950 p-1">
                            <ScrollArea className="h-[50vh] w-full">
                                <pre className="p-4 text-[11px] font-mono text-zinc-300 leading-relaxed">
                                    {FAVICON_SYSTEM_CODE.trim()}
                                </pre>
                            </ScrollArea>
                        </div>

                        <DialogFooter className="mt-6 flex gap-2">
                            <Button variant="secondary" onClick={handleCopyCode} className="font-bold flex-1">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy All Code
                            </Button>
                            <DialogClose asChild>
                                <Button className="flex-1 font-bold">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                            <h4 className="font-bold text-base">Cache-Busting Upload</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Max size: 5MB. Our unique path strategy forces browsers to bypass their local cache and display your new icon immediately across all devices.
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
