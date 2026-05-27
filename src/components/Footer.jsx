import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <p className="footer__brand">Scout Inventory</p>
          <p className="footer__text">
            Scout Du Liban-MW equipment and supply tracking.
          </p>
        </div>

        <div className="footer__meta" aria-label="Footer details">
          <span>Lebanon, South</span>
          <span>Mon-Sun, 9am-6pm</span>
          <span>2026 Scout Inventory</span>
        </div>
      </div>
    </footer>
  );
}
