"use client";

import { useState } from "react";
import { useRoshd, api } from "@/store/roshd";
import UserAvatar from "./user-avatar";

export default function LandingScreen() {
  const setScreen = useRoshd((s) => s.setScreen);
  const setAuthTab = useRoshd((s) => s.setAuthTab);
  const serverUser = useRoshd((s) => s.serverUser);
  const appData = useRoshd((s) => s.appData);
  const curUser = useRoshd((s) => s.curUser);
  const enterApp = useRoshd((s) => s.enterApp);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasAccount = !!(
    serverUser &&
    serverUser.username &&
    appData.users[serverUser.username]
  );
  const u = hasAccount ? curUser() : null;

  const goStart = () => {
    if (hasAccount) enterApp();
    else {
      setAuthTab("login");
      setScreen("auth");
    }
  };

  return (
    <section className="screen active landing" id="landingScreen">
      <svg
        className="field-anim"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="white" d="M-8 82 C 18 74, 12 46, 34 52 S 62 18, 108 26" />
        <path
          className="green"
          d="M-8 82 C 18 74, 12 46, 34 52 S 62 18, 108 26"
        />
        <path
          className="white d2"
          d="M-10 18 C 22 28, 38 6, 58 34 S 86 78, 112 58"
        />
        <path
          className="green d2"
          d="M-10 18 C 22 28, 38 6, 58 34 S 86 78, 112 58"
        />
        <path
          className="white d3"
          d="M-6 50 C 30 38, 48 72, 72 48 S 96 22, 112 40"
        />
        <path
          className="green d3"
          d="M-6 50 C 30 38, 48 72, 72 48 S 96 22, 112 40"
        />
      </svg>

      <div className="account-corner">
        <button
          className="account-btn"
          id="accountBtn"
          type="button"
          onClick={() => {
            if (hasAccount) {
              enterApp();
              return;
            }
            setMenuOpen((o) => !o);
          }}
        >
          {hasAccount ? (
            <>
              <UserAvatar src={serverUser?.avatar} name={u?.name} />
              {u?.name || "حساب من"}
            </>
          ) : (
            "حساب کاربری"
          )}
        </button>
        {menuOpen && !hasAccount ? (
          <div className="account-menu" id="accountMenu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setAuthTab("login");
                setScreen("auth");
              }}
            >
              ورود
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setAuthTab("register");
                setScreen("auth");
              }}
            >
              ثبت‌نام
            </button>
          </div>
        ) : null}
      </div>

      <div className="landing-copy">
        <h1 className="brand-title">
          <span className="w-path">مسیر</span> <span className="w-growth">رشد</span>
        </h1>
        <p className="landing-msg">
          هر روز چهار ماموریت کوتاه، متناسب با رشته و سطح تو.
        </p>
        <button className="start-btn" id="startBtn" type="button" onClick={goStart}>
          شروع
        </button>
      </div>
    </section>
  );
}
