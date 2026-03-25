import React from "react";
import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

interface LoginPageProps {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  email,
  password,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <MapPin className="text-emerald-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Admin Dashboard
        </h1>
        <p className="text-slate-700 text-center mb-8 text-sm">
          Quản lý POIs và Lộ trình Tour
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              required
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="adminisme"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-slate-700 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner /> : null}
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
