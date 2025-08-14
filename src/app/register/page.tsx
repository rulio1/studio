import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Enter your details below to get started.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your Name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Create Account
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link href="/login" className="ml-1 underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
