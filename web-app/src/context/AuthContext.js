// web-app/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import authApi from '../api/authApi';

export const AuthContext = createContext(null);

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dùng useCallback để hàm này ổn định
    const verifyUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await authApi.verifyToken();
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            } catch (error) {
                authApi.logout();
                setUser(null);
                console.error("Token verification failed", error);
            }
        }
        setLoading(false);
    }, []);

    // Effect này chạy 1 lần duy nhất khi app khởi động
    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    // ================== FIX LỖI ĐỒNG BỘ TAB MỚI ==================
    // Effect này lắng nghe thay đổi từ các tab khác
    useEffect(() => {
        const handleStorageChange = (event) => {
            // Nếu "token" bị xóa (logout ở tab khác)
            if (event.key === 'token' && event.newValue === null) {
                console.log("[AuthSync] Token bị xóa, đang đăng xuất tab này...");
                setUser(null);
            }

            // Nếu "user" bị thay đổi (login ở tab khác)
            if (event.key === 'user') {
                if (event.newValue) {
                    try {
                        console.log("[AuthSync] User thay đổi, đang cập nhật tab này...");
                        setUser(JSON.parse(event.newValue));
                    } catch (e) {
                        console.error("Lỗi parse user từ storage sync", e);
                    }
                } else {
                    // Xử lý trường hợp "user" bị xóa (logout)
                    console.log("[AuthSync] User bị xóa, đang đăng xuất tab này...");
                    setUser(null);
                }
            }
        };

        // Lắng nghe sự kiện storage
        window.addEventListener('storage', handleStorageChange);

        // Dọn dẹp
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    // ================== KẾT THÚC FIX LỖI ==================

    const login = (userData) => {
        setUser(userData);
        // Khi login, hàm authApi.login đã set localStorage rồi
        // nên event 'storage' sẽ tự động kích hoạt
    };

    const logout = () => {
        authApi.logout(); // Hàm này sẽ xóa localStorage [cite: 3113-3114]
        setUser(null);
        // Việc xóa localStorage sẽ tự động kích hoạt event 'storage'
    };

    const value = { user, login, logout, loading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
