// ✅ v1.7 Business Auth Page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessAuth } from "../context/BusinessAuthContext";

export function BusinessAuth() {
  const navigate = useNavigate();
  const {
    register,
    login,
    auth,
    error: authError,
    isLoading,
  } = useBusinessAuth();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [localError, setLocalError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (auth) {
      navigate("/business/dashboard", { replace: true });
    }
  }, [auth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(companyName, email, password, phone);
      }
      // Navigation will happen via useEffect when auth changes
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Lỗi xảy ra");
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          {isLoginMode ? "Đăng Nhập Doanh Nghiệp" : "Đăng Ký Doanh Nghiệp"}
        </h1>

        {displayError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên Công Ty
                </label>
                <input
                  type="text"
                  placeholder="VD: Du Lịch Hạ Long"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  placeholder="+84 xxx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="info@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật Khẩu {!isLoginMode && "(tối thiểu 6 ký tự)"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLoginMode ? 0 : 6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
          >
            {isLoading
              ? "Đang xử lý..."
              : isLoginMode
                ? "Đăng Nhập"
                : "Đăng Ký"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setLocalError("");
                setEmail("");
                setPassword("");
                setCompanyName("");
                setPhone("");
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {isLoginMode ? "Đăng Ký Ngay" : "Đăng Nhập"}
            </button>
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <a
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Quay về Admin
          </a>
        </div>
      </div>
    </div>
  );
}
