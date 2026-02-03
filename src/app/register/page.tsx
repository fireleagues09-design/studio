
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, auth, googleProvider } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import type { TeamMember } from "@/lib/mock-data";
import { GoogleLogo } from "@/components/GoogleLogo";
import { Eye, EyeOff } from "lucide-react";


export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inGameName, setInGameName] = useState("");
  const [inGameUid, setInGameUid] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Team state
  const [duoTeamName, setDuoTeamName] = useState("");
  const [squadTeamName, setSquadTeamName] = useState("");
  const [duoMembers, setDuoMembers] = useState<TeamMember[]>(Array(1).fill({ inGameName: '', inGameUid: '' }));
  const [squadMembers, setSquadMembers] = useState<TeamMember[]>(Array(3).fill({ inGameName: '', inGameUid: '' }));

  const handleGoogleSignUp = async (userCredential: UserCredential) => {
    setLoading(true);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        toast({ title: "Registration Error", description: "This account is already registered. Please log in.", variant: "destructive" });
        router.push('/login');
        setLoading(false);
        return;
    }
    
    // For Google Sign-Up, we don't have In-Game Name/UID or teams yet.
    // We'll use their Google display name as a placeholder and create null teams.
    const nullValue = 'N/A';
    
    try {
        await setDoc(userDocRef, {
            inGameName: user.displayName || 'New Player',
            inGameUid: nullValue, // User needs to update this
            phone: user.phoneNumber || nullValue, // May not be available
            email: user.email,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            duoTeam: { name: nullValue, type: 'Duo', members: Array(1).fill({ inGameName: nullValue, inGameUid: nullValue }) },
            squadTeam: { name: nullValue, type: 'Squad', members: Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }) },
            registeredOn: serverTimestamp(),
        });

        toast({
            title: "Welcome!",
            description: "Account created successfully with Google! Please complete your profile.",
        });
        router.push("/profile"); // Redirect to profile to complete details.
    } catch(error: any) {
        console.error("Error saving Google user:", error);
        toast({ title: "Registration Error", description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };


  const handleMemberChange = (index: number, field: 'inGameName' | 'inGameUid', value: string, type: 'duo' | 'squad') => {
    if (type === 'duo') {
        const newMembers = [...duoMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setDuoMembers(newMembers);
    } else {
        const newMembers = [...squadMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setSquadMembers(newMembers);
    }
  };
  
  const handleNullButtonClick = () => {
    const nullValue = 'N/A';
    setDuoTeamName(nullValue);
    setSquadTeamName(nullValue);
    setDuoMembers(Array(1).fill({ inGameName: nullValue, inGameUid: nullValue }));
    setSquadMembers(Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }));
  }
  
  const validateFields = () => {
    if (!email || !password || !inGameName || !inGameUid) {
      toast({ title: "Error", description: "Please fill in all required personal fields.", variant: "destructive" });
      return false;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password should be at least 6 characters.", variant: "destructive" });
      return false;
    }
    
    if (!duoTeamName || !squadTeamName) {
        toast({ title: "Error", description: "Please provide team names for both Duo and Squad.", variant: "destructive"});
        return false;
    }

    const areDuoTeammatesValid = duoMembers.every(tm => tm.inGameName.trim() !== '' && tm.inGameUid.trim() !== '');
    if (!areDuoTeammatesValid) {
         toast({
            title: "Incomplete Duo Team",
            description: `Please fill out all In-Game Names and UIDs for your Duo members.`,
            variant: "destructive",
        });
        return false;
    }
    
    const areSquadTeammatesValid = squadMembers.every(tm => tm.inGameName.trim() !== '' && tm.inGameUid.trim() !== '');
    if (!areSquadTeammatesValid) {
         toast({
            title: "Incomplete Squad Team",
            description: `Please fill out all In-Game Names and UIDs for your Squad members.`,
            variant: "destructive",
        });
        return false;
    }
    return true;
  }

  const handleRegister = async () => {
    if (!validateFields()) return;

    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDocRef = doc(db, "users", user.uid);
        
        const duoTeamData = {
            name: duoTeamName,
            type: 'Duo',
            members: duoMembers
        };
        const squadTeamData = {
            name: squadTeamName,
            type: 'Squad',
            members: squadMembers
        };

        await setDoc(userDocRef, {
          inGameName: inGameName,
          inGameUid: inGameUid,
          email: email,
          phone: '', // Phone is no longer primary, can be added later in profile
          wallet: {
            deposit: 0,
            winning: 0,
            bonus: 0,
          },
          duoTeam: duoTeamData,
          squadTeam: squadTeamData,
          registeredOn: serverTimestamp(),
        });
        
        toast({
          title: "Success",
          description: "Account created successfully!",
        });

        router.push("/");

      } catch (error: any) {
        console.error("Error creating account:", error);
        let description = "Failed to create account. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            description = "This email is already registered. Please login instead.";
        } else if (error.message) {
            description = error.message;
        }

        toast({
          title: "Registration Error",
          description: description,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
  };

    const startGoogleSignUp = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handleGoogleSignUp(result);
        } catch (error: any)
        {
            console.error("Google sign up error:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                toast({ title: "Sign-up Failed", description: error.message || "Could not sign up with Google.", variant: "destructive" });
            }
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create your account to join tournaments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <>
            <div className="relative mb-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Sign up with Google
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={startGoogleSignUp}
              disabled={loading}
            >
              <GoogleLogo className="mr-2 h-4 w-4" />
              {loading ? "Processing..." : "Sign up with Google"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or with email
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="in-game-uid">In-Game UID</Label>
                <Input
                  id="in-game-uid"
                  placeholder="e.g. 1234567890"
                  required
                  value={inGameUid}
                  onChange={(e) => setInGameUid(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="in-game-name">In-Game Name</Label>
                <Input
                  id="in-game-name"
                  placeholder="ProGamer"
                  required
                  value={inGameName}
                  onChange={(e) => setInGameName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Register Your Duo Team</h3>
              <div className="grid gap-2">
                <Label htmlFor="duo-team-name">Duo Team Name</Label>
                <Input
                  id="duo-team-name"
                  value={duoTeamName}
                  onChange={(e) => setDuoTeamName(e.target.value)}
                  placeholder="e.g. The Duo Champions"
                  required
                />
              </div>

              {Array.from({ length: 1 }).map((_, index) => (
                <div
                  key={`duo-${index}`}
                  className="p-3 border rounded-md space-y-2 bg-secondary/30"
                >
                  <Label>Teammate {index + 1}</Label>
                  <Input
                    placeholder="In-Game Name"
                    value={duoMembers[index]?.inGameName || ""}
                    onChange={(e) =>
                      handleMemberChange(index, "inGameName", e.target.value, "duo")
                    }
                    required
                  />
                  <Input
                    placeholder="In-Game UID"
                    value={duoMembers[index]?.inGameUid || ""}
                    onChange={(e) =>
                      handleMemberChange(index, "inGameUid", e.target.value, "duo")
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Register Your Squad Team</h3>
              <div className="grid gap-2">
                <Label htmlFor="squad-team-name">Squad Team Name</Label>
                <Input
                  id="squad-team-name"
                  value={squadTeamName}
                  onChange={(e) => setSquadTeamName(e.target.value)}
                  placeholder="e.g. The Squad Champions"
                  required
                />
              </div>

              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`squad-${index}`}
                  className="p-3 border rounded-md space-y-2 bg-secondary/30"
                >
                  <Label>Teammate {index + 1}</Label>
                  <Input
                    placeholder="In-Game Name"
                    value={squadMembers[index]?.inGameName || ""}
                    onChange={(e) =>
                      handleMemberChange(
                        index,
                        "inGameName",
                        e.target.value,
                        "squad"
                      )
                    }
                    required
                  />
                  <Input
                    placeholder="In-Game UID"
                    value={squadMembers[index]?.inGameUid || ""}
                    onChange={(e) =>
                      handleMemberChange(
                        index,
                        "inGameUid",
                        e.target.value,
                        "squad"
                      )
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground pt-2">
                if you don't have team members, then click on the null button
                down below. you can add team members later by contacting players
                support
              </p>
              <Button
                variant="outline"
                onClick={handleNullButtonClick}
                className="w-full mt-2"
              >
                Null
              </Button>
            </div>
            
            <Button onClick={handleRegister} className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </>

          <div className="mt-4 text-center text-sm">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms and Conditions
            </Link>
            .
          </div>
          <div className="mt-2 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
