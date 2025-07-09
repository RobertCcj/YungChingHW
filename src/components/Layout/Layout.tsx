import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { spotifyService } from '../../services/spotify';
import styles from './Layout.module.scss';

export function Layout() {
  const navigate = useNavigate();
  const isAuthenticated = spotifyService.isAuthenticated();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    spotifyService.logout();
    navigate('/explore');
    window.location.reload();
  };

  // 點擊遮罩收起
  const handleOverlayClick = () => setMenuOpen(false);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <NavLink to="/explore" className={styles.logo}>
            🎵 RobertChunag
          </NavLink>

          {/* 漢堡按鈕 */}
          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="開啟選單"
          >
            <span className={styles.hamburger}></span>
          </button>

          {/* 桌面版選單 */}
          <ul className={styles.navLinks}>
            <li>
              <NavLink
                to="/explore"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                探索音樂
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/favorites"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                我的最愛
              </NavLink>
            </li>
          </ul>

          <div className={styles.userActions}>
            {isAuthenticated ? (
              <>
                <span className={styles.userInfo}>已連接 Spotify</span>
                <button className={styles.logoutButton} onClick={handleLogout}>
                  登出
                </button>
              </>
            ) : (
              <span className={styles.userInfo}>未連接</span>
            )}
          </div>

          {/* 手機版側邊選單 */}
          {menuOpen && (
            <div
              className={styles.mobileOverlay}
              onClick={handleOverlayClick}
            ></div>
          )}
          <div
            className={`${styles.mobileMenu} ${
              menuOpen ? styles.mobileMenuOpen : ''
            }`}
          >
            <div className={styles.mobileMenuContent}>
              <NavLink
                to="/explore"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                探索音樂
              </NavLink>
              <NavLink
                to="/favorites"
                className={({ isActive }) =>
                  `${styles.mobileNavLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                我的最愛
              </NavLink>
              <div className={styles.mobileMenuSpacer}></div>
              {isAuthenticated ? (
                <>
                  <span className={styles.mobileUserInfo}>已連接 Spotify</span>
                  <button
                    className={styles.mobileLogoutButton}
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    登出
                  </button>
                </>
              ) : (
                <span className={styles.mobileUserInfo}>未連接</span>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 RobertChung. 使用 Spotify Web API </p>
      </footer>
    </div>
  );
}