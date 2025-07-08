import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { spotifyService } from '../../services/spotify';
import styles from './Layout.module.scss';

export function Layout() {
  const navigate = useNavigate();
  const isAuthenticated = spotifyService.isAuthenticated();

  const handleLogout = () => {
    spotifyService.logout();
    navigate('/explore');
    window.location.reload();
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <NavLink to="/explore" className={styles.logo}>
            🎵 MusicApp
          </NavLink>

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
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2024 MusicApp. 使用 Spotify Web API 提供服務</p>
      </footer>
    </div>
  );
}