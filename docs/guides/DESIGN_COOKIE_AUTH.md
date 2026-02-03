# Cookie-Based Authentication Design

## Status: Proposal (未実装・検討中)

> **Note**: 本ドキュメントは設計提案です。現在の実装は localStorage + JWT Bearer トークン方式です（`src/stores/useAuthStore.ts`, `src/api/client.ts` 参照）。Cookie 方式への移行は未着手です。

## 背景

現状のlocalStorage + JWT方式には以下の課題がある:
- XSS攻撃でトークンが盗まれるリスク
- ページロード時に手動でトークンをhttpClientにセットする必要がある
- 複数タブ間の同期が面倒

## 提案: HttpOnly Cookie方式

### メリット

| 観点 | localStorage + JWT | HttpOnly Cookie |
|------|-------------------|-----------------|
| XSS耐性 | ❌ JSでアクセス可能 | ✅ JSからアクセス不可 |
| 自動送信 | ❌ 手動でヘッダー追加 | ✅ 自動送信 |
| CSRF | ✅ 問題なし | ⚠️ 対策必要（SameSite） |
| セッション無効化 | ❌ サーバー側で不可 | ✅ 可能 |

## 実装設計

### 1. バックエンド変更（user-service）

#### Login Handler
```go
// handler.go

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
    // ... 認証ロジック ...

    // JWTトークン生成
    token, _ := h.service.Login(ctx, req)

    // HttpOnly Cookieにセット
    secure := os.Getenv("ENV") == "production"
    http.SetCookie(w, &http.Cookie{
        Name:     "auth_token",
        Value:    token.Token,
        Path:     "/",
        HttpOnly: true,                    // JSからアクセス不可
        Secure:   secure,                  // HTTPS必須（本番のみ）
        SameSite: http.SameSiteLaxMode,    // CSRF対策
        MaxAge:   86400 * 7,               // 7日間
    })

    // レスポンスにはユーザー情報のみ（トークンは含めない）
    middleware.JSON(w, r, http.StatusOK, map[string]interface{}{
        "user": token.User,
    })
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
    // Cookieを削除
    http.SetCookie(w, &http.Cookie{
        Name:     "auth_token",
        Value:    "",
        Path:     "/",
        HttpOnly: true,
        MaxAge:   -1,  // 即時削除
    })
    w.WriteHeader(http.StatusNoContent)
}
```

#### Auth Middleware
```go
// middleware/auth.go

func AuthMiddleware(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            var tokenString string

            // 1. まずCookieから取得を試みる
            if cookie, err := r.Cookie("auth_token"); err == nil {
                tokenString = cookie.Value
            }

            // 2. なければAuthorizationヘッダーから（API互換性のため）
            if tokenString == "" {
                authHeader := r.Header.Get("Authorization")
                if strings.HasPrefix(authHeader, "Bearer ") {
                    tokenString = strings.TrimPrefix(authHeader, "Bearer ")
                }
            }

            if tokenString == "" {
                Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
                return
            }

            // JWT検証
            claims, err := jwtManager.ValidateToken(tokenString)
            if err != nil {
                Error(w, r, http.StatusUnauthorized, "INVALID_TOKEN", "Invalid or expired token")
                return
            }

            ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### 2. フロントエンド変更

#### HTTP Client (大幅にシンプル化)
```typescript
// api/client.ts

class HttpClient {
  async request<T>(baseUrl: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${baseUrl}/api/v1${endpoint}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← これだけ！Cookieを自動送信
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData.code || 'UNKNOWN_ERROR', errorData.message)
    }

    if (response.status === 204) return {} as T

    const json = await response.json()
    return (json.data !== undefined ? json.data : json) as T
  }

  // setAuthToken() は不要になる
}
```

#### Auth Store (トークン管理が不要に)
```typescript
// stores/useAuthStore.ts

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          // Cookieは自動でセットされる
          const response = await httpClient.post<{ user: User }>(
            API_CONFIG.baseUrls.user,
            '/auth/login',
            { email, password }
          )
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await httpClient.post(API_CONFIG.baseUrls.user, '/auth/logout')
        } finally {
          set({ user: null, isAuthenticated: false })
        }
      },

      // ページロード時にセッション確認
      checkSession: async () => {
        try {
          const response = await httpClient.get<User>(
            API_CONFIG.baseUrls.user,
            '/users/me'
          )
          set({ user: response, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kensan-auth',
      partialize: (state) => ({ user: state.user }), // userだけ永続化（表示用）
    }
  )
)
```

#### App.tsx (起動時にセッション確認)
```typescript
function App() {
  const { checkSession, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkSession().finally(() => setIsChecking(false))
  }, [checkSession])

  if (isChecking) {
    return <LoadingSpinner />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ... */}
      </Routes>
    </BrowserRouter>
  )
}
```

### 3. CORS設定（バックエンド）

Cookie送信にはCORS設定が必要:

```go
// middleware/cors.go

func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")

        // 許可するオリジンのリスト
        allowedOrigins := []string{
            "http://localhost:5173",
            "http://localhost:3000",
        }

        for _, allowed := range allowedOrigins {
            if origin == allowed {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                w.Header().Set("Access-Control-Allow-Credentials", "true")  // 重要！
                break
            }
        }

        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

## 移行手順

1. バックエンドにCookie設定を追加（既存のJWT認証と並行稼働）
2. フロントエンドで`credentials: 'include'`を追加
3. 動作確認後、フロントエンドからトークン管理コードを削除
4. バックエンドからレスポンスのtoken fieldを削除

## 開発環境の注意点

- ローカル開発（HTTP）では`Secure: false`が必要
- `SameSite: Lax`はGETリクエストでCookieを送信するため、リンク遷移でも認証が維持される
- Chrome DevToolsのApplication > Cookies でCookieを確認可能

## 参考

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
