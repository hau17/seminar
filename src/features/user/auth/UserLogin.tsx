import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiService } from "../../../services/api";
import { useTranslation } from "react-i18next";

export function UserLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect and sync language
  const defaultLang = localStorage.getItem("user_lang") || (navigator.language.startsWith("vi") ? "vi" : "en");
  const [language, setLanguage] = useState(defaultLang);
  const [languages, setLanguages] = useState<{code: string, name: string}[]>([]);
  const [fetchingLangs, setFetchingLangs] = useState(true);

  useEffect(() => {
    localStorage.setItem("user_lang", language);
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await apiService.get("/api/languages");
        if (res.ok) {
          const data = await res.json();
          setLanguages(data);
          
          // Nếu ngôn ngữ hiện tại không có trong DB thì lấy cái đầu tiên
          if (data.length > 0 && !data.find((l: any) => l.code === defaultLang)) {
            setLanguage(data[0].code);
          }
        } else {
          setLanguages([{ code: "vi", name: "Tiếng Việt" }, { code: "en", name: "English" }]);
        }
      } catch (e) {
        setLanguages([{ code: "vi", name: "Tiếng Việt" }, { code: "en", name: "English" }]);
      } finally {
        setFetchingLangs(false);
      }
    };
    fetchLanguages();
  }, [defaultLang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiService.post("/api/auth/user/login", { email, password });
      const data = await res.json();

      // ── BUG FIX: Xử lý HTTP 400/401 từ server ─────────────────────────────
      // Trước đây: res.json() thành công dù status=400 → data.token undefined
      // → không throw → catch không chạy → không có thông báo lỗi nào.
      if (!res.ok) {
        // Server trả về lỗi (400 Sai mật khẩu, 401 Chưa xác thực, 404 Không tìm thấy tài khoản...)
        const message = data?.message || data?.error || t("login.error_fail");
        toast.error(message, { id: "login-error" });
        return;
      }

      if (!data.token) {
        toast.error("Phản hồi từ server không hợp lệ. Vui lòng thử lại.", { id: "login-error" });
        return;
      }

      // ── Đăng nhập thành công ───────────────────────────────────────────────
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("user_info", JSON.stringify(data.user));
      localStorage.setItem("user_lang", language);

      toast.success(t("login.success") || "Đăng nhập thành công! 🎉");
      navigate("/user/info");
    } catch (err: any) {
      // Lỗi mạng hoàn toàn (fetch fail, không kết nối được server)
      toast.error("Không thể kết nối máy chủ. Kiểm tra lại kết nối mạng.", { id: "login-error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">{t("login.title")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("login.email")}</label>
            <input
              type="email"
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("login.password")}</label>
            <input
              type="password"
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("login.language")}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading || fetchingLangs}
              className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              {fetchingLangs ? (
                <option value={language}>{t("layout.sync.loading")}</option>
              ) : (
                languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t("login.submitting")}
              </>
            ) : (
              t("login.submit")
            )}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          {t("login.no_account")}{" "}
          <Link to="/user/register" className="text-blue-600 hover:text-blue-500 font-medium">
            {t("login.register_now")}
          </Link>
        </div>
      </div>
    </div>
  );
}
