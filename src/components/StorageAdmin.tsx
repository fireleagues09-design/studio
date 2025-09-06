
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, HardDrive, RefreshCw } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { manageStorage, type StorageFile } from '@/app/admin/actions';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export default function StorageAdmin() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const idToken = await user.getIdToken();
        const result = await manageStorage(idToken, 'list');
        if (result.success && result.files) {
            setFiles(result.files);
        } else {
            throw new Error(result.message || 'Failed to list files.');
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
        fetchFiles();
    }
  }, [user]);

  const handleDelete = async (filePath: string) => {
    if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
    }
    
    try {
        const idToken = await user.getIdToken();
        const result = await manageStorage(idToken, 'delete', filePath);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            setFiles(prevFiles => prevFiles.filter(f => f.name !== filePath));
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
      toast({
        title: 'Error Deleting File',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Management
            </CardTitle>
            <CardDescription>
            View and delete any file from your Firebase Storage bucket.
            </CardDescription>
        </div>
         <Button variant="outline" size="icon" onClick={fetchFiles} disabled={loading || authLoading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>File Path</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {loading || authLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                           <TableRow key={`skel-${i}`}>
                                <TableCell colSpan={4}>
                                    <Skeleton className="h-8 w-full" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : files.length > 0 ? (
                        files.map(file => (
                            <TableRow key={file.name}>
                                <TableCell className="font-mono text-xs">{file.name}</TableCell>
                                <TableCell>{formatBytes(file.size)}</TableCell>
                                <TableCell>{format(new Date(file.updated), 'PPp')}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon">
                                            <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the file <span className="font-bold font-mono">{file.name}</span>.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(file.name)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No files found in storage or you don't have permission.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
