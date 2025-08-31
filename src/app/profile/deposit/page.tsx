
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';

export default function DepositPage() {
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const upiId = 'fireleagues@examplebank';

    const handleCopyUpi = () => {
        navigator.clipboard.writeText(upiId);
        toast({
            title: "Copied!",
            description: "UPI ID copied to clipboard.",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !transactionId) {
            toast({
                title: 'Error',
                description: 'Please fill out all fields.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        // In a real app, you would send this data to your backend to be verified by an admin.
        // For now, we'll just simulate a successful submission.
        await new Promise(resolve => setTimeout(resolve, 1500));

        setLoading(false);
        setAmount('');
        setTransactionId('');
        toast({
            title: 'Request Submitted',
            description: 'Your deposit request has been received. It will be processed within 24 hours after verification.',
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/profile">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Profile
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">Add Funds to Wallet</CardTitle>
                    <CardDescription>
                        Complete an offline payment and submit the details here.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="font-semibold mb-2">Payment Instructions</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Transfer the desired amount to the UPI ID below. After the transfer, enter the amount and the transaction ID from your payment app.
                        </p>
                        <div className="flex items-center justify-between p-3 bg-background rounded-md">
                            <p className="text-lg font-mono text-primary">{upiId}</p>
                            <Button variant="ghost" size="icon" onClick={handleCopyUpi}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (INR)</Label>
                            <Input 
                                id="amount"
                                type="number"
                                placeholder="e.g., 500"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="transactionId">Transaction ID / UTR</Label>
                            <Input 
                                id="transactionId"
                                type="text"
                                placeholder="Enter the 12-digit reference number"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                required 
                            />
                        </div>
                         <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Deposit Request'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
