* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: Arial, "Noto Sans Myanmar", sans-serif;
  background: #0b1020;
  color: #ffffff;
}

.container {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 16px 50px;
}

/* HERO */

.hero {
  text-align: center;
  padding: 35px 10px 25px;
}

.badge {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 30px;
  background: #27355f;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
}

.hero h1 {
  margin: 18px 0 10px;
  font-size: 42px;
  line-height: 1.15;
}

.hero p {
  margin: 0;
  color: #b9c2dc;
  font-size: 17px;
}

/* CARD */

.card {
  background: #151d34;
  border: 1px solid #2a3658;
  border-radius: 20px;
  padding: 24px;
  margin-top: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

/* FILE DROP */

.drop {
  min-height: 220px;
  border: 2px dashed #4d5d89;
  border-radius: 16px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 12px;
  padding: 25px;
  text-align: center;

  cursor: pointer;

  transition: 0.2s;
}

.drop:hover {
  border-color: #7187ff;
  background: #1a2440;
}

.drop input {
  display: none;
}

.icon {
  font-size: 55px;
  line-height: 1;
}

.drop strong {
  font-size: 18px;
}

.drop small {
  color: #9ba7c6;
  font-size: 14px;
}

/* BUTTON */

button {
  display: block;
  width: 100%;

  margin-top: 18px;
  padding: 15px;

  border: 0;
  border-radius: 12px;

  background: #536dfe;
  color: #ffffff;

  font-size: 17px;
  font-weight: bold;

  cursor: pointer;

  transition: 0.2s;
}

button:hover {
  background: #4058e8;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* PROGRESS */

.progress {
  width: 100%;
  height: 9px;

  background: #293452;
  border-radius: 10px;

  margin-top: 20px;

  overflow: hidden;
}

#bar {
  width: 0%;
  height: 100%;

  background: #536dfe;

  border-radius: 10px;

  transition: width 0.3s ease;
}

/* STATUS */

#status {
  margin-top: 15px;
  color: #b9c2dc;
  text-align: center;
  line-height: 1.6;
}

/* RESULT */

.hidden {
  display: none !important;
}

#result h2 {
  margin-top: 0;
  text-align: center;
}

/* DOWNLOAD LINKS */

.links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.links a {
  display: block;
  width: 100%;

  padding: 15px;

  border-radius: 12px;

  background: #536dfe;
  color: #ffffff;

  text-align: center;
  text-decoration: none;

  font-size: 16px;
  font-weight: bold;

  transition: 0.2s;
}

.links a:hover {
  background: #4058e8;
}

/* MOBILE */

@media (max-width: 600px) {

  .container {
    padding: 12px 12px 40px;
  }

  .hero {
    padding: 25px 5px 18px;
  }

  .hero h1 {
    font-size: 32px;
  }

  .hero p {
    font-size: 15px;
  }

  .card {
    padding: 18px;
    border-radius: 16px;
  }

  .drop {
    min-height: 190px;
  }

  .icon {
    font-size: 45px;
  }

}
