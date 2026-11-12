// ===== 輪播資料 =====
// 每一組輪播都設定：
// 1. autoplayMs：自動輪播間隔時間
// 2. slides：輪播圖片資料
// 3. key：對應上方/下方按鈕的識別值
// 4. src：圖片路徑
// 5. alt：圖片替代文字
//
// 自動輪播、左右箭頭、圓點、按鈕點擊
// 都會同步更新「目前作用中的按鈕」。

const carouselData = {

  // ===== 交通機能輪播 =====
  transport: {
    autoplayMs: 4000,

    slides: [
      {
        key: "airport",
        src: "assets/traffic03.jpg",
        alt: "桃園機場"
      },
      {
        key: "aerotropolis",
        src: "assets/traffic02.jpg",
        alt: "桃園航空城"
      },
      {
        key: "hsr",
        src: "assets/traffic01.jpg",
        alt: "青埔高鐵特區"
      },
      {
        key: "mrt",
        src: "assets/traffic04.jpg",
        alt: "機捷大園站"
      }
    ]
  },


  // ===== 生活機能輪播 =====
  lifestyle: {
    autoplayMs: 4000,

    slides: [
      {
        key: "pxmart",
        src: "assets/shopping01.jpg",
        alt: "全聯"
      },
      {
        key: "mcdonalds",
        src: "assets/shopping3.jpg",
        alt: "麥當勞"
      },
      {
        key: "starbucks",
        src: "assets/shopping2.jpg",
        alt: "星巴克"
      },
      {
        key: "poya",
        src: "assets/shopping4.jpg",
        alt: "寶雅"
      }
    ]
  },


  // ===== 公設 / 生活空間輪播 =====
  brilliant: {
    autoplayMs: 4500,

    slides: [
      {
        key: "living",
        src: "assets/life-living-room.jpg",
        alt: "交誼廳示意"
      },
      {
        key: "laundry",
        src: "assets/life-laundry.jpg",
        alt: "洗衣房示意"
      },
      {
        key: "kids",
        src: "assets/life-kids-room.jpg",
        alt: "兒童遊戲區示意"
      },
      {
        key: "gym",
        src: "assets/life-gym.jpg",
        alt: "健身房示意"
      },
      {
        key: "garden",
        src: "assets/life-garden.png",
        alt: "中庭花園示意圖"
      }
    ]
  }

};



// =====================================================
// 共用輪播控制 Class
// =====================================================
class SyncedCarousel {

  constructor(rootEl, config, filterGroupEl) {

    // 輪播最外層元素
    this.rootEl = rootEl;

    // 對應 carouselData 中的資料
    this.config = config;

    // 對應的篩選按鈕群組
    this.filterGroupEl = filterGroupEl;


    // 主輪播圖片
    this.imageEl = rootEl.querySelector(".carousel__image");

    // 圓點區
    this.dotsEl = rootEl.querySelector("[data-dots]");

    // 上一張按鈕
    this.prevBtn = rootEl.querySelector('[data-action="prev"]');

    // 下一張按鈕
    this.nextBtn = rootEl.querySelector('[data-action="next"]');


    // 目前顯示第幾張
    this.currentIndex = 0;

    // 自動播放計時器
    this.timer = null;

    // 圖片淡入淡出計時器
    this.transitionTimer = null;

    // 是否已經完成第一次畫面顯示
    this.hasRendered = false;

    // 紀錄滑動開始位置
    this.pointerStartX = null;



    // =====================================================
    // 預先載入所有圖片
    // 避免輪播切換時才載入造成閃爍
    // =====================================================
    this.config.slides.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });



    // =====================================================
    // 上一張
    // =====================================================
    this.prevBtn?.addEventListener("click", () => {

      // 往前切一張
      this.step(-1);

      // 使用者手動操作後重新計算自動播放時間
      this.restartAutoplay();

    });



    // =====================================================
    // 下一張
    // =====================================================
    this.nextBtn?.addEventListener("click", () => {

      // 往後切一張
      this.step(1);

      // 使用者手動操作後重新計算自動播放時間
      this.restartAutoplay();

    });



    // =====================================================
    // 滑鼠停在輪播上時暫停自動播放
    // =====================================================
    this.rootEl.addEventListener("mouseenter", () => {
      this.stopAutoplay();
    });


    // =====================================================
    // 滑鼠離開後繼續自動播放
    // =====================================================
    this.rootEl.addEventListener("mouseleave", () => {
      this.startAutoplay();
    });



    // =====================================================
    // 手機 / 滑鼠拖曳輪播
    // pointerdown：紀錄起始位置
    // =====================================================
    this.rootEl.addEventListener("pointerdown", (e) => {

      this.pointerStartX = e.clientX;

    });



    // =====================================================
    // pointerup：判斷滑動方向
    // =====================================================
    this.rootEl.addEventListener("pointerup", (e) => {

      // 沒有起始座標就不處理
      if (this.pointerStartX === null) return;

      // 計算左右滑動距離
      const delta = e.clientX - this.pointerStartX;

      // 清空紀錄
      this.pointerStartX = null;

      // 滑動距離太短，不算切換
      if (Math.abs(delta) < 45) return;

      // 往左滑 → 下一張
      // 往右滑 → 上一張
      this.step(delta < 0 ? 1 : -1);

      // 重啟自動播放
      this.restartAutoplay();

    });



    // =====================================================
    // pointer 被取消時清空起始位置
    // =====================================================
    this.rootEl.addEventListener("pointercancel", () => {

      this.pointerStartX = null;

    });



    // =====================================================
    // 上方 / 下方 chip 按鈕切換輪播
    // data-key 必須和 slide.key 一致
    // =====================================================
    this.filterGroupEl
      ?.querySelectorAll(".chip")
      .forEach((btn) => {

        btn.addEventListener("click", () => {

          // 取得按鈕自己的 key
          const key = btn.dataset.key;

          // 找出對應輪播圖片位置
          const index = this.config.slides.findIndex(
            (slide) => slide.key === key
          );

          // 找到就切換
          if (index >= 0) {
            this.goTo(index);
          }

        });

      });



    // 產生圓點
    this.renderDots();

    // 顯示第一張
    this.render();

    // 啟動自動播放
    this.startAutoplay();

  }



  // =====================================================
  // 切換上一張 / 下一張
  // direction：
  // -1 = 上一張
  //  1 = 下一張
  // =====================================================
  step(direction) {

    const total = this.config.slides.length;

    if (!total) return;

    // 使用 % 讓第一張和最後一張可以循環切換
    this.currentIndex =
      (this.currentIndex + direction + total) % total;

    this.render();

  }



  // =====================================================
  // 指定切換到某一張
  // =====================================================
  goTo(index) {

    // 防止 index 超出圖片數量
    if (
      index < 0 ||
      index >= this.config.slides.length
    ) return;

    this.currentIndex = index;

    this.render();

    // 手動切換後重新計時
    this.restartAutoplay();

  }



  // =====================================================
  // 更新目前輪播畫面
  // =====================================================
  render() {

    // 取得目前圖片資料
    const slide =
      this.config.slides[this.currentIndex];

    if (!slide) return;



    // =====================================================
    // 同步更新按鈕與圓點狀態
    // =====================================================
    const updateStates = () => {

      // 更新 chip 按鈕
      if (this.filterGroupEl) {

        this.filterGroupEl
          .querySelectorAll(".chip")
          .forEach((chip) => {

            // 判斷這顆按鈕是否為目前圖片
            const active =
              chip.dataset.key === slide.key;

            // 加上 / 移除作用中樣式
            chip.classList.toggle(
              "is-active",
              active
            );

            // 無障礙屬性
            chip.setAttribute(
              "aria-pressed",
              active ? "true" : "false"
            );

          });

      }



      // 更新圓點
      [...this.dotsEl.children].forEach(
        (dot, index) => {

          const active =
            index === this.currentIndex;

          dot.classList.toggle(
            "is-active",
            active
          );

          dot.setAttribute(
            "aria-current",
            active ? "true" : "false"
          );

        }
      );

    };



    // =====================================================
    // 第一次顯示圖片
    // 第一次不需要做淡出效果
    // =====================================================
    if (!this.hasRendered) {

      this.imageEl.src = slide.src;

      this.imageEl.alt =
        slide.alt || "";

      this.hasRendered = true;

      updateStates();

      return;

    }



    // =====================================================
    // 後續圖片切換
    // 使用 is-fading 做淡出 → 換圖 → 淡入
    // =====================================================
    clearTimeout(this.transitionTimer);

    // 先淡出目前圖片
    this.imageEl.classList.add(
      "is-fading"
    );



    this.transitionTimer =
      setTimeout(() => {

        // 更換圖片
        this.imageEl.src = slide.src;

        this.imageEl.alt =
          slide.alt || "";

        // 同步按鈕 / 圓點
        updateStates();



        // 等瀏覽器完成一次畫面更新後
        // 再移除淡出 class
        // 讓新圖片有淡入動畫
        requestAnimationFrame(() => {

          requestAnimationFrame(() => {

            this.imageEl.classList.remove(
              "is-fading"
            );

          });

        });

      }, 220);

  }



  // =====================================================
  // 自動產生輪播圓點
  // =====================================================
  renderDots() {

    // 清空原本圓點
    this.dotsEl.innerHTML = "";



    this.config.slides.forEach(
      (slide, index) => {

        // 建立 button
        const dot =
          document.createElement("button");

        dot.type = "button";

        dot.className =
          "carousel__dot";

        // 無障礙標籤
        dot.setAttribute(
          "aria-label",
          `切換到 ${
            slide.alt ||
            `第 ${index + 1} 張`
          }`
        );

        // 點擊圓點切換
        dot.addEventListener(
          "click",
          () => this.goTo(index)
        );

        // 加入圓點區
        this.dotsEl.appendChild(dot);

      }
    );

  }



  // =====================================================
  // 開始自動輪播
  // =====================================================
  startAutoplay() {

    // 避免重複建立 timer
    this.stopAutoplay();



    // 沒設定時間或只有一張圖片
    // 就不用自動輪播
    if (
      !this.config.autoplayMs ||
      this.config.slides.length <= 1
    ) return;



    this.timer =
      setInterval(() => {

        this.step(1);

      }, this.config.autoplayMs);

  }



  // =====================================================
  // 停止自動輪播
  // =====================================================
  stopAutoplay() {

    if (this.timer) {

      clearInterval(this.timer);

      this.timer = null;

    }

  }



  // =====================================================
  // 重啟自動輪播
  // =====================================================
  restartAutoplay() {

    this.startAutoplay();

  }

}



// =====================================================
// 網頁 DOM 載入完成後執行
// =====================================================
document.addEventListener(
  "DOMContentLoaded",
  () => {



    // =====================================================
    // 頁面內錨點平滑捲動
    // 例如 href="#contact"
    // =====================================================
    document
      .querySelectorAll('a[href^="#"]')
      .forEach((a) => {

        a.addEventListener(
          "click",
          (e) => {

            const target =
              document.querySelector(
                a.getAttribute("href")
              );

            // 找不到目標就維持原本行為
            if (!target) return;

            // 阻止瀏覽器直接跳轉
            e.preventDefault();

            // 平滑捲動
            target.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }
        );

      });



    // =====================================================
    // 初始化所有輪播
    //
    // HTML 範例：
    // data-carousel="transport"
    //
    // 系統會自動去 carouselData 找 transport
    // =====================================================
    document
      .querySelectorAll("[data-carousel]")
      .forEach((carouselEl) => {

        // 取得輪播名稱
        const name =
          carouselEl.dataset.carousel;

        // 對應資料
        const config =
          carouselData[name];

        // 對應按鈕群組
        const filterGroupEl =
          document.querySelector(
            `[data-filter-group="${name}"]`
          );

        // 沒資料就不建立
        if (!config) return;

        // 建立輪播
        new SyncedCarousel(
          carouselEl,
          config,
          filterGroupEl
        );

      });



    // =====================================================
    // 預約表單相關 DOM
    // =====================================================

    // 預約表單
    const contactForm =
      document.getElementById(
        "contactForm"
      );

    // 個資聲明視窗
    const privacyModal =
      document.getElementById(
        "privacyModal"
      );

    // 送出成功視窗
    const successModal =
      document.getElementById(
        "successModal"
      );

    // 開啟個資聲明按鈕
    const privacyTrigger =
      document.querySelector(
        "[data-open-privacy]"
      );

    // 個資 Modal 關閉按鈕
    const privacyCloseButtons =
      privacyModal
        ?.querySelectorAll(
          ".privacy-modal-close"
        ) || [];

    // 成功 Modal 關閉按鈕
    const successCloseButtons =
      successModal
        ?.querySelectorAll(
          ".success-modal-confirm, .success-modal-close"
        ) || [];

    // 個資同意 checkbox
    const privacyConsent =
      document.getElementById(
        "privacyConsent"
      );

    // 表單送出按鈕
    const submitBtn =
      document.getElementById(
        "submitBtn"
      );

    // 表單狀態文字
    const formStatus =
      document.getElementById(
        "formStatus"
      );



    // 記錄開啟 Modal 前
    // 使用者焦點在哪個元素
    let focusBeforePrivacyModal = null;

    let focusBeforeSuccessModal = null;



    // =====================================================
    // 開啟個資聲明 Modal
    // =====================================================
    function openPrivacyModal() {

      if (!privacyModal) return;

      // 記住目前焦點
      focusBeforePrivacyModal =
        document.activeElement;

      // 顯示 Modal
      privacyModal.classList.add(
        "is-open"
      );

      privacyModal.setAttribute(
        "aria-hidden",
        "false"
      );

      // 防止背景頁面捲動
      document.body.classList.add(
        "modal-open"
      );

      // 焦點移到關閉按鈕
      privacyModal
        .querySelector(
          ".privacy-modal-close"
        )
        ?.focus();

    }



    // =====================================================
    // 關閉個資聲明 Modal
    // =====================================================
    function closePrivacyModal() {

      if (!privacyModal) return;

      privacyModal.classList.remove(
        "is-open"
      );

      privacyModal.setAttribute(
        "aria-hidden",
        "true"
      );

      document.body.classList.remove(
        "modal-open"
      );

      // 焦點回到原本位置
      focusBeforePrivacyModal?.focus();

    }



    // =====================================================
    // 開啟送出成功 Modal
    // =====================================================
    function openSuccessModal() {

      if (!successModal) return;

      // 關閉後焦點回到 submit
      focusBeforeSuccessModal =
        submitBtn;

      successModal.classList.add(
        "is-open"
      );

      successModal.setAttribute(
        "aria-hidden",
        "false"
      );

      document.body.classList.add(
        "modal-open"
      );

      successModal
        .querySelector(
          ".success-modal-confirm"
        )
        ?.focus();

    }



    // =====================================================
    // 關閉成功 Modal
    // =====================================================
    function closeSuccessModal() {

      if (!successModal) return;

      successModal.classList.remove(
        "is-open"
      );

      successModal.setAttribute(
        "aria-hidden",
        "true"
      );

      document.body.classList.remove(
        "modal-open"
      );

      focusBeforeSuccessModal?.focus();

    }



    // =====================================================
    // Modal 按鈕事件
    // =====================================================

    privacyTrigger?.addEventListener(
      "click",
      openPrivacyModal
    );


    privacyCloseButtons.forEach(
      (button) =>
        button.addEventListener(
          "click",
          closePrivacyModal
        )
    );


    successCloseButtons.forEach(
      (button) =>
        button.addEventListener(
          "click",
          closeSuccessModal
        )
    );



    // =====================================================
    // 點擊 Modal 黑色背景區域也可以關閉
    // =====================================================
    privacyModal?.addEventListener(
      "click",
      (event) => {

        if (
          event.target === privacyModal
        ) {
          closePrivacyModal();
        }

      }
    );


    successModal?.addEventListener(
      "click",
      (event) => {

        if (
          event.target === successModal
        ) {
          closeSuccessModal();
        }

      }
    );



    // =====================================================
    // ESC 鍵關閉 Modal
    // =====================================================
    document.addEventListener(
      "keydown",
      (event) => {

        if (event.key !== "Escape") {
          return;
        }

        if (
          privacyModal?.classList.contains(
            "is-open"
          )
        ) {
          closePrivacyModal();
        }

        if (
          successModal?.classList.contains(
            "is-open"
          )
        ) {
          closeSuccessModal();
        }

      }
    );



    // =====================================================
    // 個資 checkbox 驗證
    // =====================================================
    privacyConsent?.addEventListener(
      "invalid",
      function () {

        this.setCustomValidity(
          this.dataset
            .validationRequiredMessage ||
          "請確認個資事項"
        );

      }
    );


    privacyConsent?.addEventListener(
      "change",
      function () {

        // 有修改就清除自訂錯誤
        this.setCustomValidity("");

      }
    );



    // =====================================================
    // 縣市 / 鄉鎮選單
    // 沿用 twzipcode 外掛
    // =====================================================
    if (
      window.jQuery &&
      document.getElementById(
        "zipcode3"
      )
    ) {

      const $ = window.jQuery;



      $("#zipcode3").twzipcode({

        // 自動產生三個欄位的 CSS class
        css: [
          "city form-control",
          "town form-control",
          "zipcode d-none"
        ],

        // 縣市欄位 name
        countyName: "city",

        // 鄉鎮欄位 name
        districtName: "town"

      });



      // 縣市必填
      $("select[name='city']")
        .attr({
          required: true,
          "aria-label": "縣市"
        })
        .on(
          "invalid",
          function () {

            this.setCustomValidity(
              "請選擇縣市"
            );

          }
        )
        .on(
          "change",
          function () {

            this.setCustomValidity("");

          }
        );



      // 鄉鎮區 aria-label
      $("select[name='town']")
        .attr(
          "aria-label",
          "鄉鎮市區"
        );

    }



    // =====================================================
    // 設定送出按鈕狀態
    //
    // isSending = true
    // → 禁止再次點擊
    // → 顯示「傳送中…」
    // =====================================================
    function setSubmitState(
      isSending
    ) {

      if (!submitBtn) return;

      submitBtn.disabled = isSending;

      submitBtn.classList.toggle(
        "is-sending",
        isSending
      );

      submitBtn.innerHTML =
        isSending
          ? "傳送中…"
          : '送出預約 <span>↗</span>';

    }



    // =====================================================
    // 顯示表單狀態訊息
    //
    // isError = true
    // → 套用錯誤樣式
    // =====================================================
    function showMessage(
      text,
      isError = false
    ) {

      if (!formStatus) return;

      formStatus.textContent = text;

      formStatus.classList.toggle(
        "is-error",
        isError
      );

    }



    // =====================================================
    // 預約表單送出
    // =====================================================
    contactForm?.addEventListener(
      "submit",
      async function (event) {

        // 阻止瀏覽器原本 submit 跳頁
        event.preventDefault();

        // 清除原本訊息
        showMessage("");



        // =================================================
        // HTML 原生欄位驗證
        // required / type=email 等
        // =================================================
        if (
          !contactForm.checkValidity()
        ) {

          contactForm.reportValidity();

          return;

        }



        // 顯示傳送中
        setSubmitState(true);



        // =================================================
        // 取得表單所有資料
        // =================================================
        const formData =
          new FormData(contactForm);



        // twzipcode 產生的縣市 / 鄉鎮資料
        let city =
          formData.get("city") || "";

        let town =
          formData.get("town") || "";



        // 如果 FormData 沒抓到
        // 再從 jQuery selector 取得一次
        if (
          (!city || !town) &&
          window.jQuery
        ) {

          const $ = window.jQuery;

          city =
            city ||
            $("[name='city']").val() ||
            "";

          town =
            town ||
            $("[name='town']").val() ||
            "";

        }



        // =================================================
        // 取得使用者輸入資料
        // =================================================
        const name =
          formData.get("name") || "";

        const phone =
          formData.get("phone") || "";

        const gender =
          formData.get("gender") || "";

        const email =
          formData.get("email") || "";

        const consent =
          formData.get(
            "privacyConsent"
          ) === "yes";



        // =================================================
        // 寄信 API 資料
        // =================================================
        const mailData = {

          // 收件人
          to: "maizizi@gmail.com",

          // 郵件標題
          subject:
            "【柏德序日】網站預約表單",

          // 郵件內容
          text:
`姓名：${name}
性別：${gender}
電話：${phone}
信箱：${email}
縣市：${city}
鄉鎮區：${town}
個資聲明：${consent ? "本人已悉知" : "未勾選"}`

        };



        // =================================================
        // Google Apps Script
        // 用來將表單資料寫入 Google Sheets
        // =================================================
        // 【貼網址的地方】柏德序日自己的 Apps Script 部署網址（以 /exec 結尾）貼在引號中間。
        // 部署步驟見 google-sheet-baide/Code.gs 最上面的說明。
        // 留空 = 只寄信、不寫入試算表（避免寫到別的案子的試算表）
        const googleScriptUrl = "https://script.google.com/macros/s/AKfycbwRWGJg9_3WzfzNWaY_zk83n_4qhKQqWK8mJ5BoIpLw9UrAikk5j28RM3Jmxn0v8fMv/exec";



        // Google Sheet 傳送資料
        const googleData = {

          name,
          gender,
          phone,
          email,
          city,
          town,

          privacyConsent:
            consent

        };



        try {

          // =================================================
          // 同時執行：
          //
          // 1. 寄出 Email
          // 2. 寫入 Google Sheets
          //
          // Promise.allSettled：
          // 即使其中一個失敗，
          // 仍可知道另一個執行結果
          // =================================================
          const [
            mailResult,
            sheetResult
          ] =
            await Promise.allSettled([



              // =========================
              // Email API
              // =========================
              fetch(
                "https://www.maizizi.vaserver.com/api/mail_api.php",
                {

                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify(
                      mailData
                    )

                }
              ),



              // =========================
              // Google Sheets
              // =========================
              !googleScriptUrl
                ? Promise.resolve()
                : fetch(
                googleScriptUrl,
                {

                  method: "POST",

                  // no-cors：
                  // 避免 Apps Script CORS 問題
                  mode: "no-cors",

                  headers: {
                    "Content-Type":
                      "text/plain"
                  },

                  body:
                    JSON.stringify(
                      googleData
                    )

                }
              )



            ]);



          // =================================================
          // Email fetch 本身失敗
          // =================================================
          if (
            mailResult.status ===
            "rejected"
          ) {

            // 判斷 Sheets 是否有成功發送 request
            const sheetNote =
              sheetResult.status ===
              "fulfilled"
                ? "Google Sheets 請求已送出。"
                : "Google Sheets 請求也未送出。";

            throw new Error(
              `郵件傳送失敗。${sheetNote}`
            );

          }



          // =================================================
          // 取得 Email API Response
          // =================================================
          const mailResponse =
            mailResult.value;

          let mailJson = null;



          // 嘗試解析 JSON
          // 如果 API 沒回 JSON 也不讓程式中斷
          try {

            mailJson =
              await mailResponse.json();

          } catch (_) {}



          // =================================================
          // HTTP Status 非 2xx
          // =================================================
          if (!mailResponse.ok) {

            throw new Error(

              (
                mailJson &&
                mailJson.message
              ) ||

              `郵件服務 HTTP ${mailResponse.status}`

            );

          }



          // =================================================
          // 傳送成功
          // =================================================

          // 清空表單
          contactForm.reset();



          // 重設 twzipcode
          if (window.jQuery) {

            const $ = window.jQuery;

            $("#zipcode3")
              .twzipcode("reset");

          }



          // 清空狀態訊息
          showMessage("");

          // 顯示成功視窗
          openSuccessModal();



        } catch (error) {

          // =================================================
          // 傳送失敗
          // =================================================
          console.error(
            "Reservation form error:",
            error
          );

          showMessage(
            `傳送失敗：${error.message} 請稍後再試。`,
            true
          );



        } finally {

          // =================================================
          // 不論成功或失敗
          // 都恢復按鈕
          // =================================================
          setSubmitState(false);

        }

      }
    );

  }
);



// =====================================================
// Mobile architect auto carousel
// 手機版建築師卡片自動橫向輪播
// =====================================================
document.addEventListener(
  "DOMContentLoaded",
  () => {

    // 建築師卡片橫向容器
    const strip =
      document.querySelector(
        ".arch-strip"
      );

    // 找不到就直接停止
    if (!strip) return;



    // =====================================================
    // 只有 700px 以下才啟用
    // =====================================================
    const mq =
      window.matchMedia(
        "(max-width: 700px)"
      );



    // 自動輪播計時器
    let timer = null;

    // 目前卡片 index
    let index = 0;

    // 使用者操作後延遲恢復輪播
    let userPauseTimer = null;



    // =====================================================
    // 每次即時取得所有卡片
    // =====================================================
    const cards = () =>
      Array.from(
        strip.querySelectorAll(
          ".arch-card"
        )
      );



    // =====================================================
    // 找出目前最接近左側位置的卡片
    // =====================================================
    function nearestIndex() {

      const list = cards();

      if (!list.length) return 0;

      // 目前橫向捲動位置
      const left = strip.scrollLeft;

      let best = 0;

      let dist = Infinity;



      list.forEach(
        (card, i) => {

          // 比較卡片和 scrollLeft 距離
          const d =
            Math.abs(
              card.offsetLeft - left
            );

          // 找出距離最小者
          if (d < dist) {

            dist = d;

            best = i;

          }

        }
      );

      return best;

    }



    // =====================================================
    // 捲動到指定卡片
    // =====================================================
    function goTo(i) {

      const list = cards();

      // 沒卡片或不是手機尺寸就不執行
      if (
        !list.length ||
        !mq.matches
      ) return;



      // 循環 index
      index =
        (i + list.length) %
        list.length;



      // 平滑捲動到該卡片
      strip.scrollTo({

        left:
          list[index].offsetLeft,

        behavior: "smooth"

      });

    }



    // =====================================================
    // 停止手機版自動輪播
    // =====================================================
    function stop() {

      if (timer) {

        clearInterval(timer);

        timer = null;

      }

    }



    // =====================================================
    // 開始手機版自動輪播
    // =====================================================
    function start() {

      // 避免重複 timer
      stop();



      // 只有手機尺寸且卡片超過一張
      // 才啟用自動輪播
      if (
        !mq.matches ||
        cards().length <= 1
      ) return;



      timer =
        setInterval(() => {

          // 先重新判斷目前是哪一張
          index =
            nearestIndex();

          // 下一張
          goTo(index + 1);

        }, 4200);

    }



    // =====================================================
    // 使用者操作時：
    //
    // 1. 暫停自動輪播
    // 2. 3.2 秒後恢復
    // =====================================================
    function pauseAfterInteraction() {

      stop();

      clearTimeout(
        userPauseTimer
      );

      userPauseTimer =
        setTimeout(
          start,
          3200
        );

    }



    // =====================================================
    // 滑鼠 / 手指開始操作
    // =====================================================
    strip.addEventListener(
      "pointerdown",
      pauseAfterInteraction,
      {
        passive: true
      }
    );


    strip.addEventListener(
      "touchstart",
      pauseAfterInteraction,
      {
        passive: true
      }
    );



    // =====================================================
    // 使用者自己滑動時
    // 同步目前 index
    // =====================================================
    strip.addEventListener(
      "scroll",
      () => {

        if (mq.matches) {

          index =
            nearestIndex();

        }

      },
      {
        passive: true
      }
    );



    // =====================================================
    // 使用者切換瀏覽器分頁時
    //
    // 隱藏 → 停止輪播
    // 回來 → 繼續輪播
    // =====================================================
    document.addEventListener(
      "visibilitychange",
      () => {

        if (document.hidden) {

          stop();

        } else {

          start();

        }

      }
    );



    // =====================================================
    // 螢幕尺寸跨過 700px 時
    // 重新判斷是否啟動輪播
    // =====================================================
    mq.addEventListener?.(
      "change",
      start
    );



    // 初始啟動
    start();

  }
);

// 手機空拍圖：首次滑動後將引導淡出，保留原生觸控左右捲動。
(() => {
  const viewport = document.querySelector('.env-mobile__scroll');
  const hint = document.querySelector('.env-mobile__gesture');
  if (!viewport || !hint) return;
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    hint.classList.add('is-dismissed');
  };
  viewport.addEventListener('scroll', dismiss, { passive: true, once: true });
  viewport.addEventListener('touchmove', dismiss, { passive: true, once: true });
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') dismiss();
  });
})();

// =============================================================
// 億東營造｜建築外觀圖燈箱（無須外部插件）
// 開啟與關閉：全畫面淡入淡出；上一張／下一張：圖片先淡出再淡入。
// 支援鍵盤 ESC、左右方向鍵、手機滑動；還原開啟前的焦點與捲動。
// =============================================================
function initBuilderLightbox() {
  const figures = [...document.querySelectorAll('.builder .project-strip figure')];
  const modal = document.getElementById('projectLightbox');
  if (!figures.length || !modal || modal.dataset.initialized === 'true') return;
  modal.dataset.initialized = 'true';
  const photo = modal.querySelector('.project-lightbox__image');
  const caption = modal.querySelector('.project-lightbox__caption');
  const counter = modal.querySelector('.project-lightbox__counter');
  const prev = modal.querySelector('.project-lightbox__arrow--prev');
  const next = modal.querySelector('.project-lightbox__arrow--next');
  const closeBtn = modal.querySelector('.project-lightbox__close');
  const figure = modal.querySelector('.project-lightbox__figure');
  let current = 0, opener = null, previousOverflow = '', isOpen = false;
  let imageTimer = null, closeTimer = null, openFrame = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeTime = reducedMotion ? 0 : 185;
  const overlayTime = reducedMotion ? 0 : 270;
  const render = index => {
    current = (index + figures.length) % figures.length;
    const fig = figures[current];
    const original = fig.querySelector('img');
    if (!original) return;
    // 使用原先存放在 assets 的圖片，不額外載入第三方燈箱。
    photo.src = original.currentSrc || original.src;
    photo.alt = original.alt || fig.querySelector('figcaption')?.textContent.trim() || '建築實績圖片';
    caption.textContent = fig.querySelector('figcaption')?.textContent.trim() || '';
    counter.textContent = `${current + 1} / ${figures.length}`;
  };
  const change = index => {
    if (!isOpen) return;
    clearTimeout(imageTimer);
    if (reducedMotion) { render(index); return; }
    figure.classList.add('is-switching');
    imageTimer = setTimeout(() => {
      render(index);
      // 確保 DOM 有機會套用淡出狀態，隨後再淡入。
      requestAnimationFrame(() => figure.classList.remove('is-switching'));
    }, fadeTime);
  };
  const open = (index, target) => {
    clearTimeout(closeTimer);
    clearTimeout(imageTimer);
    opener = target;
    render(index);
    figure.classList.remove('is-switching');
    if (!isOpen) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    isOpen = true;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('is-visible');
    cancelAnimationFrame(openFrame);
    openFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => { if (isOpen) modal.classList.add('is-visible'); });
    });
    closeBtn.focus({preventScroll:true});
  };
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    cancelAnimationFrame(openFrame);
    clearTimeout(imageTimer);
    figure.classList.remove('is-switching');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    closeTimer = setTimeout(() => {
      if (isOpen) return;
      modal.hidden = true;
      document.body.style.overflow = previousOverflow;
      opener?.focus({preventScroll:true});
    }, overlayTime);
  };
  figures.forEach((fig, index) => {
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', `放大檢視：${fig.querySelector('figcaption')?.textContent.trim() || '建築實績圖片'}`);
    fig.addEventListener('click', () => open(index, fig));
    fig.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();open(index, fig);}
    });
  });
  closeBtn.addEventListener('click', close);
  prev.addEventListener('click', () => change(current - 1));
  next.addEventListener('click', () => change(current + 1));
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => {
    if (!isOpen) return;
    if (e.key === 'Escape') {e.preventDefault();close();}
    else if (e.key === 'ArrowLeft') {e.preventDefault();change(current - 1);}
    else if (e.key === 'ArrowRight') {e.preventDefault();change(current + 1);}
    else if (e.key === 'Tab') {
      const controls = [closeBtn,prev,next];
      const i = controls.indexOf(document.activeElement);
      if (e.shiftKey && i === 0) {e.preventDefault();next.focus();}
      else if (!e.shiftKey && i === controls.length-1) {e.preventDefault();closeBtn.focus();}
    }
  });
  let touchX = null;
  modal.addEventListener('touchstart', e => {if (e.touches.length === 1) touchX=e.touches[0].clientX;},{passive:true});
  modal.addEventListener('touchend', e => {
    if (!isOpen || touchX === null || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX=null;
    if (Math.abs(dx) > 55) change(current + (dx < 0 ? 1 : -1));
  }, {passive:true});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBuilderLightbox);
else initBuilderLightbox();
