import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showRegister ? <RegisterForm /> : <LoginForm />}
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 mb-3">
            {showRegister ? "Already have an account?" : "Need an account?"}
          </p>
          <Button
            variant="ghost"
            onClick={() => setShowRegister(!showRegister)}
            className="text-blue-600 hover:text-blue-700"
            data-testid="toggle-auth-form"
          >
            {showRegister ? "Sign In" : "Create Account"}
          </Button>
        </div>
        
        {!showRegister && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Default Admin Access</h3>
            <p className="text-xs text-blue-700">
              Email: admin@fenntechltd.com<br />
              Password: FennTech2024!
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Please change this password after first login
            </p>
          </div>
        )}
      </div>
    </div>
  );
}