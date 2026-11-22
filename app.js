// ==========================================
// 1. CONFIGURE YOUR RECEIVERS HERE
// ========================================== 
const STORE_CONFIG = {
  googleSheetUrl: "https://script.google.com/macros/s/AKfycbyvWqPvoGLYWQgAhlkJVqxIeU9qGn2tGst-aDsumzuHzRa-9pM5Gzke3Dw3IKFBobA/exec",
  whatsappNumber: "919945243930",
  upiId: "Q637743750@ybl",
  merchantName: "SATTVA Devotional Store"
};

let products = [];
let activeCategory = "All";
let selectedProduct = null;
let orderQty = 1;
let selectedSize = "";
let placedOrders = [];
let pdpImages = [];
let pdpImageIndex = 0;

// Helper: Determine available sizes for clothing categories or explicit product sizes
function getProductSizes(product) {
  if (!product) return [];
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes;
  }
  if (product.category === "Dhoti Kurtas" || product.category === "Gopi Dress") {
    return ["S", "M", "L", "XL", "XXL"];
  }
  return [];
}

// Load products dynamically from products.json
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  const showAllBtn = document.getElementById("showAllBtn");

  try {
    const response = await fetch("products.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    products = Array.isArray(data) ? data : [];
    showAllBtn.textContent = `Show All (${products.length})`;
    renderProducts(products);
    initLatestArrivalsSlider(products);
    handleUrlHashProduct();
  } catch (error) {
    grid.innerHTML = `<p class="grid-status-msg">Unable to load products.json. Make sure you are running on a local server or GitHub Pages.</p>`;
  }
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML = `<p class="grid-status-msg">No products added yet. Add your items inside <strong>products.json</strong> to display them here.</p>`;
    return;
  }

  if (list.length === 0) {
    grid.innerHTML = `<p class="grid-status-msg">No offerings match your current search or category filter.</p>`;
    return;
  }

  grid.innerHTML = list.map(item => {
    const priceFormatted = Number(item.price || 0).toLocaleString("en-IN");
    const swatchesHtml = Array.isArray(item.swatches)
      ? item.swatches.map(color => `<span class="swatch" style="background:${color}"></span>`).join("")
      : "";

    return `
      <article class="product-card">
        <div class="product-media product-card-clickable" onclick="openProductDetail(${item.id})">
          ${item.tag ? `<span class="product-tag">${item.tag}</span>` : ""}
          <button class="wishlist-btn" onclick="event.stopPropagation(); this.classList.toggle('active')" aria-label="Save item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <img src="${item.image}" alt="${item.name}">
        </div>
        <h3 class="product-title product-card-clickable" onclick="openProductDetail(${item.id})">${item.name}</h3>
        <div class="product-meta">${item.subtitle || ""}</div>
        <div class="product-price-row">
          <span class="product-price">₹${priceFormatted}</span>
          <div class="swatches">${swatchesHtml}</div>
        </div>
        <button class="buy-now-btn" onclick="openProductDetail(${item.id})">View Details</button>
      </article>
    `;
  }).join("");
}

// ==========================================
// LATEST ARRIVALS 1-IN-A-ROW SLIDER (3s INTERVAL)
// ==========================================
let latestSliderTimer = null;
let latestSlideIndex = 0;

function initLatestArrivalsSlider(allProducts) {
  const headerEl = document.getElementById("latestArrivalsHeader");
  const sliderEl = document.getElementById("latestSlider");
  const dotsEl = document.getElementById("latestDots");
  if (!sliderEl || !dotsEl || !headerEl) return;

  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    headerEl.style.display = "none";
    sliderEl.style.display = "none";
    return;
  }

  // Pick only the latest product for each category (newest item added in products.json wins)
  const latestByCategoryMap = new Map();
  allProducts.forEach(item => {
    const catKey = (item.category || "General").trim();
    latestByCategoryMap.set(catKey, item);
  });

  // Reverse so the most recently added category appears first
  const latestPerCategory = Array.from(latestByCategoryMap.values()).reverse();

  headerEl.style.display = "flex";
  sliderEl.style.display = "block";
  latestSlideIndex = 0;

  sliderEl.innerHTML = latestPerCategory
    .map((item, idx) => {
      const priceFormatted = Number(item.price || 0).toLocaleString("en-IN");
      const descText = item.description || item.subtitle || "Sacred devotional offering from SATTVA.";
      return `
        <div class="latest-slide ${idx === 0 ? "active" : ""}" onclick="openProductDetail(${item.id})">
          <div class="latest-slide-media">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="latest-slide-content">
            <span class="latest-badge">Latest in ${item.category}</span>
            <h3>${item.name}</h3>
            <p>${descText}</p>
            <div class="latest-slide-footer">
              <span class="latest-slide-price">₹${priceFormatted}</span>
              <span class="section-link">View Details &rarr;</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  dotsEl.innerHTML = latestPerCategory
    .map(
      (_, idx) =>
        `<button type="button" class="latest-dot ${idx === 0 ? "active" : ""}" aria-label="Slide ${idx + 1}" onclick="event.stopPropagation(); goToLatestSlide(${idx}, ${latestPerCategory.length})"></button>`
    )
    .join("");

  if (latestSliderTimer) clearInterval(latestSliderTimer);

  if (latestPerCategory.length > 1) {
    const startTimer = () => {
      if (latestSliderTimer) clearInterval(latestSliderTimer);
      latestSliderTimer = setInterval(() => {
        goToLatestSlide((latestSlideIndex + 1) % latestPerCategory.length, latestPerCategory.length);
      }, 3000);
    };

    startTimer();
    sliderEl.onmouseenter = () => clearInterval(latestSliderTimer);
    sliderEl.onmouseleave = () => startTimer();
  }
}

function goToLatestSlide(index, total) {
  const slides = document.querySelectorAll("#latestSlider .latest-slide");
  const dots = document.querySelectorAll("#latestDots .latest-dot");
  if (!slides.length) return;

  latestSlideIndex = index % total;
  slides.forEach((s, i) => s.classList.toggle("active", i === latestSlideIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === latestSlideIndex));
}

// ==========================================
// PRODUCT DETAIL PAGE (PDP) & MULTI-IMAGE GALLERY
// ==========================================
function setupPdpGallery(product) {
  pdpImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image];
  pdpImageIndex = 0;
  renderPdpImage();
}

function renderPdpImage() {
  const imgEl = document.getElementById("pdpImage");
  const prevBtn = document.getElementById("pdpPrevImgBtn");
  const nextBtn = document.getElementById("pdpNextImgBtn");
  const counterEl = document.getElementById("pdpImgCounter");
  const thumbsEl = document.getElementById("pdpThumbs");

  imgEl.src = pdpImages[pdpImageIndex];
  imgEl.alt = selectedProduct ? selectedProduct.name : "Product Image";

  const hasMultiple = pdpImages.length > 1;
  prevBtn.style.display = hasMultiple ? "flex" : "none";
  nextBtn.style.display = hasMultiple ? "flex" : "none";
  counterEl.style.display = hasMultiple ? "inline-block" : "none";
  thumbsEl.style.display = hasMultiple ? "flex" : "none";

  if (hasMultiple) {
    counterEl.textContent = `${pdpImageIndex + 1} / ${pdpImages.length}`;
    thumbsEl.innerHTML = pdpImages
      .map(
        (src, idx) => `
          <button type="button" class="pdp-thumb ${idx === pdpImageIndex ? "active" : ""}" onclick="selectPdpImage(${idx})" aria-label="View image ${idx + 1}">
            <img src="${src}" alt="Thumbnail ${idx + 1}">
          </button>
        `
      )
      .join("");
  } else {
    thumbsEl.innerHTML = "";
  }
}

function stepPdpImage(delta) {
  if (pdpImages.length <= 1) return;
  pdpImageIndex = (pdpImageIndex + delta + pdpImages.length) % pdpImages.length;
  renderPdpImage();
}

function selectPdpImage(idx) {
  if (idx < 0 || idx >= pdpImages.length) return;
  pdpImageIndex = idx;
  renderPdpImage();
}

function openProductDetail(productId) {
  const item = products.find(p => p.id === productId);
  if (!item) return;

  selectedProduct = item;
  orderQty = 1;

  const sizes = getProductSizes(item);
  selectedSize = sizes.length > 0 ? (sizes.includes("M") ? "M" : sizes[0]) : "";

  document.getElementById("storefrontMain").style.display = "none";
  document.getElementById("productDetailView").style.display = "block";

  const tagEl = document.getElementById("pdpTag");
  if (item.tag) {
    tagEl.textContent = item.tag;
    tagEl.style.display = "inline-block";
  } else {
    tagEl.style.display = "none";
  }

  setupPdpGallery(item);

  document.getElementById("pdpCategory").textContent = item.category || "Sacred Offering";
  document.getElementById("pdpTitle").textContent = item.name;
  document.getElementById("pdpPrice").textContent = `₹${Number(item.price || 0).toLocaleString("en-IN")}`;
  document.getElementById("pdpSubtitle").textContent = item.subtitle || "Authentic Devotional Craft";
  document.getElementById("pdpDescription").textContent =
    item.description ||
    `Authentic ${item.name} from SATTVA (${item.category}). Crafted with reverence for daily sadhana and temple offerings.`;

  const swatchBlock = document.getElementById("pdpSwatchesBlock");
  const swatchContainer = document.getElementById("pdpSwatches");
  if (Array.isArray(item.swatches) && item.swatches.length > 0) {
    swatchContainer.innerHTML = item.swatches
      .map(color => `<span class="swatch" style="background:${color}"></span>`)
      .join("");
    swatchBlock.style.display = "block";
  } else {
    swatchBlock.style.display = "none";
  }

  const sizeBlock = document.getElementById("pdpSizeBlock");
  const sizeChips = document.getElementById("pdpSizeChips");
  if (sizes.length > 0) {
    document.getElementById("pdpSelectedSizeLabel").textContent = selectedSize;
    sizeChips.innerHTML = sizes
      .map(sz => `<button type="button" class="size-chip ${sz === selectedSize ? "active" : ""}" onclick="selectProductSize('${sz}')">${sz}</button>`)
      .join("");
    sizeBlock.style.display = "block";
  } else {
    sizeBlock.style.display = "none";
  }

  updatePdpControls();
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#product=${item.id}`);
}

function selectProductSize(size) {
  selectedSize = size;
  document.getElementById("pdpSelectedSizeLabel").textContent = size;
  document.querySelectorAll("#pdpSizeChips .size-chip").forEach(btn => {
    btn.classList.toggle("active", btn.textContent === size);
  });
}

function changePdpQty(delta) {
  orderQty = Math.max(1, Math.min(20, orderQty + delta));
  updatePdpControls();
}

function updatePdpControls() {
  if (!selectedProduct) return;
  document.getElementById("pdpQty").textContent = orderQty;
  const total = Number(selectedProduct.price || 0) * orderQty;
  const buyBtn = document.getElementById("pdpBuyNowBtn");
  buyBtn.textContent = `Buy Now · ₹${total.toLocaleString("en-IN")}`;
  buyBtn.onclick = () => openCheckout(selectedProduct.id, orderQty, selectedSize);
}

function closeProductDetail() {
  const pdp = document.getElementById("productDetailView");
  if (pdp && pdp.style.display !== "none") {
    pdp.style.display = "none";
    document.getElementById("storefrontMain").style.display = "block";
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

function handleUrlHashProduct() {
  const match = window.location.hash.match(/^#product=(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    if (products.some(p => p.id === id)) {
      openProductDetail(id);
    }
  }
}

window.addEventListener("hashchange", () => {
  if (!window.location.hash.startsWith("#product=")) {
    closeProductDetail();
  } else {
    handleUrlHashProduct();
  }
});

// ==========================================
// FILTER & CATEGORY CAROUSEL
// ==========================================
function filterProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = products.filter(p => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const matchesText =
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(query));
    return matchesCat && matchesText;
  });
  renderProducts(filtered);
}

function selectCategory(category, element) {
  activeCategory = category;
  document.getElementById("gridHeading").textContent = category === "All" ? "Sacred Offerings" : category;
  document.querySelectorAll(".cat-item").forEach(el => el.classList.remove("active"));
  if (element) {
    element.classList.add("active");
  }
  filterProducts();
  scrollToProducts();
}

function resetFilters() {
  activeCategory = "All";
  document.getElementById("searchInput").value = "";
  document.getElementById("gridHeading").textContent = "Sacred Offerings";
  document.querySelectorAll(".cat-item").forEach(el => el.classList.remove("active"));
  renderProducts(products);
}

function scrollToProducts() {
  document.getElementById("featuredSection").scrollIntoView({ behavior: "smooth" });
}

function initCategoryCarousel() {
  const strip = document.getElementById("categoryStrip");
  if (!strip) return;

  const originalItems = Array.from(strip.children);
  originalItems.forEach(item => {
    const clone = item.cloneNode(true);
    strip.appendChild(clone);
  });

  let isPaused = false;
  let isDown = false;
  let startX = 0;
  let scrollLeftStart = 0;
  let hasDragged = false;
  const speed = 0.45;

  strip.addEventListener("mouseenter", () => (isPaused = true));
  strip.addEventListener("mouseleave", () => {
    isPaused = false;
    isDown = false;
    strip.classList.remove("dragging");
  });
  strip.addEventListener("touchstart", () => (isPaused = true), { passive: true });
  strip.addEventListener("touchend", () => {
    setTimeout(() => (isPaused = false), 1200);
  });

  strip.addEventListener("mousedown", e => {
    isDown = true;
    hasDragged = false;
    strip.classList.add("dragging");
    startX = e.pageX - strip.offsetLeft;
    scrollLeftStart = strip.scrollLeft;
  });

  strip.addEventListener("mousemove", e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - strip.offsetLeft;
    const walk = (x - startX) * 1.4;
    if (Math.abs(walk) > 5) hasDragged = true;
    strip.scrollLeft = scrollLeftStart - walk;
  });

  strip.addEventListener("mouseup", () => {
    isDown = false;
    strip.classList.remove("dragging");
  });

  strip.addEventListener(
    "click",
    e => {
      if (hasDragged) {
        e.stopPropagation();
        hasDragged = false;
      }
    },
    true
  );

  function step() {
    if (!isPaused && !isDown) {
      strip.scrollLeft += speed;
      const halfWidth = strip.scrollWidth / 2;
      if (strip.scrollLeft >= halfWidth) {
        strip.scrollLeft -= halfWidth;
      }
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ==========================================
// CHECKOUT DRAWER LOGIC (Prepaid UPI Only)
// ==========================================
function openCheckout(productId, initialQty = 1, initialSize = "") {
  selectedProduct = products.find(p => p.id === productId);
  if (!selectedProduct) return;

  orderQty = initialQty;
  const sizes = getProductSizes(selectedProduct);
  selectedSize = sizes.length > 0 ? (initialSize || (sizes.includes("M") ? "M" : sizes[0])) : "";

  document.getElementById("checkoutFormView").style.display = "block";
  document.getElementById("drawerFooter").style.display = "block";
  document.getElementById("confirmationView").classList.remove("active");
  document.getElementById("drawerTitle").textContent = "Complete Offering";

  document.getElementById("modalProductImg").src = selectedProduct.image;
  document.getElementById("modalProductName").textContent = selectedProduct.name;
  document.getElementById("modalProductMeta").textContent = selectedProduct.subtitle || selectedProduct.category;
  document.getElementById("modalUnitPrice").textContent = `₹${Number(selectedProduct.price).toLocaleString("en-IN")}`;
  document.getElementById("displayUpiId").textContent = STORE_CONFIG.upiId;
  document.getElementById("utrInput").value = "";

  const checkoutSizeBlock = document.getElementById("checkoutSizeBlock");
  const checkoutSizeChips = document.getElementById("checkoutSizeChips");
  if (sizes.length > 0) {
    checkoutSizeChips.innerHTML = sizes
      .map(sz => `<button type="button" class="size-chip ${sz === selectedSize ? "active" : ""}" onclick="selectCheckoutSize('${sz}')">${sz}</button>`)
      .join("");
    checkoutSizeBlock.style.display = "block";
  } else {
    checkoutSizeBlock.style.display = "none";
  }

  updateBilling();
  document.getElementById("checkoutBackdrop").classList.add("open");
}

function selectCheckoutSize(size) {
  selectedSize = size;
  document.querySelectorAll("#checkoutSizeChips .size-chip").forEach(btn => {
    btn.classList.toggle("active", btn.textContent === size);
  });
  updateBilling();
}

function closeCheckout() {
  document.getElementById("checkoutBackdrop").classList.remove("open");
}

function closeDrawerOnOutside(e) {
  if (e.target.id === "checkoutBackdrop") {
    closeCheckout();
  }
}

function changeQty(delta) {
  orderQty = Math.max(1, Math.min(20, orderQty + delta));
  updateBilling();
}

function copyUpiId() {
  navigator.clipboard.writeText(STORE_CONFIG.upiId).then(() => {
    const btn = document.getElementById("copyUpiBtn");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 2000);
  });
}

function updateBilling() {
  if (!selectedProduct) return;
  document.getElementById("modalQty").textContent = orderQty;

  const subtotal = Number(selectedProduct.price) * orderQty;
  const shipping = subtotal >= 999 ? 0 : 60;
  const total = subtotal + shipping;

  document.getElementById("billSubtotal").textContent = `₹${subtotal.toLocaleString("en-IN")}`;
  document.getElementById("billShipping").textContent = shipping === 0 ? "Free" : `₹${shipping}`;
  document.getElementById("billTotal").textContent = `₹${total.toLocaleString("en-IN")}`;

  const sizeSuffix = selectedSize ? ` (${selectedSize})` : "";
  const note = encodeURIComponent(`SATTVA - ${selectedProduct.name}${sizeSuffix} x${orderQty}`);
  const pa = encodeURIComponent(STORE_CONFIG.upiId);
  const pn = encodeURIComponent(STORE_CONFIG.merchantName);
  const upiUri = `upi://pay?pa=${pa}&pn=${pn}&am=${total}&cu=INR&tn=${note}`;

  document.getElementById("upiPayLink").href = upiUri;
  document.getElementById("upiPayLink").textContent = `Pay ₹${total.toLocaleString("en-IN")} via UPI App`;
  document.getElementById("upiQrImg").src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

  const btn = document.getElementById("submitOrderBtn");
  btn.textContent = `Confirm Payment & Place Order · ₹${total.toLocaleString("en-IN")}`;
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Recording Order...";

  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const pin = document.getElementById("custPin").value.trim();
  const utrVal = document.getElementById("utrInput").value.trim();

  const subtotal = Number(selectedProduct.price) * orderQty;
  const shipping = subtotal >= 999 ? 0 : 60;
  const total = subtotal + shipping;
  const orderNum = "STV-" + Math.floor(1000 + Math.random() * 9000);
  const productLabel = selectedSize ? `${selectedProduct.name} (Size: ${selectedSize})` : selectedProduct.name;
  const paymentDetail = `UPI Paid (UTR: ${utrVal})`;

  const orderPayload = {
    orderNum,
    name,
    phone,
    address,
    pin,
    product: productLabel,
    qty: orderQty,
    total,
    paymentMode: "UPI PREPAID",
    paymentDetail
  };

  if (STORE_CONFIG.googleSheetUrl) {
    try {
      await fetch(STORE_CONFIG.googleSheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(orderPayload)
      });
    } catch (err) {
      console.error("Sheet logging failed:", err);
    }
  }

  placedOrders.push(orderPayload);
  document.getElementById("orderCountBadge").textContent = placedOrders.length;

  const waText = [
    `*NEW PREPAID ORDER: #${orderNum}*`,
    `Item: ${orderQty} x ${productLabel}`,
    `Amount Paid: Rs. ${total.toLocaleString("en-IN")}`,
    `UPI Ref / UTR: ${utrVal}`,
    `---`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address} - ${pin}`
  ].join("\n");

  const waLink = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(waText)}`;

  document.getElementById("checkoutFormView").style.display = "none";
  document.getElementById("drawerFooter").style.display = "none";
  document.getElementById("drawerTitle").textContent = "Receipt";
  document.getElementById("confirmedOrderId").textContent = `ORDER #${orderNum}`;

  document.getElementById("confirmedSummaryText").innerHTML = `
    Thank you, <strong>${name}</strong>. Your order for <strong>${orderQty} &times; ${productLabel}</strong> has been logged.<br><br>
    Payment of <strong>₹${total.toLocaleString("en-IN")}</strong> recorded with UPI Ref/UTR: <strong>${utrVal}</strong>.<br><br>
    Dispatching to: ${address} - ${pin} (${phone}).<br><br>
    <a href="${waLink}" target="_blank" rel="noopener" class="btn-primary" style="display:block; text-align:center; margin-top:12px;">
      Send Payment Receipt on WhatsApp
    </a>
  `;

  document.getElementById("confirmationView").classList.add("active");
  submitBtn.disabled = false;

  if (STORE_CONFIG.whatsappNumber) {
    window.open(waLink, "_blank", "noopener");
  }
}

function showRecentOrder() {
  if (placedOrders.length === 0) {
    alert("No orders placed yet. Click on any offering to view details and order.");
    return;
  }
  const last = placedOrders[placedOrders.length - 1];
  alert(`Latest Order: #${last.orderNum}\nItem: ${last.qty}x ${last.product}\nPaid: ₹${last.total}\n${last.paymentDetail}`);
}

// ==========================================
// NEWSLETTER SUBSCRIPTION (WITH DUPLICATE CHECK)
// ==========================================
function normalizeSubscriber(raw) {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned.includes("@")) {
    return cleaned;
  }
  return cleaned.replace(/[\s+-]/g, "").slice(-10);
}

async function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("newsletterContact");
  const submitBtn = e.target.querySelector("button[type='submit']");
  const contact = input.value.trim();
  if (!contact) return;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const digitsOnly = contact.replace(/[\s+-]/g, "").slice(-10);
  const isPhone = /^[6-9]\d{9}$/.test(digitsOnly);

  if (!isEmail && !isPhone) {
    alert("Please enter a valid email address or 10-digit mobile number.");
    return;
  }

  const normalizedValue = normalizeSubscriber(contact);
  const subscribers = JSON.parse(localStorage.getItem("sattva_subscribers") || "[]");
  const alreadyExists = subscribers.some(item => normalizeSubscriber(item) === normalizedValue);

  if (alreadyExists) {
    alert("Already subscribed");
    e.target.reset();
    return;
  }

  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Subscribing...";

  const finalContactToSave = isEmail ? contact.toLowerCase() : digitsOnly;

  if (STORE_CONFIG.googleSheetUrl) {
    try {
      await fetch(STORE_CONFIG.googleSheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          type: "subscriber",
          contact: finalContactToSave
        })
      });
    } catch (err) {
      console.error("Subscriber logging failed:", err);
    }
  }

  subscribers.push(finalContactToSave);
  localStorage.setItem("sattva_subscribers", JSON.stringify(subscribers));

  alert(`Hare Krishna! ${finalContactToSave} is now subscribed to SATTVA Panchang & New Arrival alerts.`);
  e.target.reset();
  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
}

// Store Policy & Seva Info Drawer
const INFO_PAGES = {
  artisans: {
    title: "Artisan Clusters",
    body: "<p>Every SATTVA offering is crafted in partnership with traditional weaver and woodcraft families across Vrindavan, Kashi, and South India, ensuring fair wages and authentic temple-grade workmanship.</p>"
  },
  purity: {
    title: "Purity Standards",
    body: "<p>Our Japa Malas and Kanti Malas are turned from genuine sacred Tulsi wood, our Dhoti Kurtas and Gopi Dresses use breathable handloom cotton, and our perfumes are 100% alcohol-free natural attars.</p>"
  },
  temple: {
    title: "Temple & Bulk Supplies",
    body: "<p>Planning festival distributions, Gita Jayanti book seva, or temple yatra kits? Reach out directly on WhatsApp for wholesale pricing and custom sacred packaging.</p><br><a href='https://wa.me/919945243930?text=Hare%20Krishna!%20I%20would%20like%20to%20enquire%20about%20bulk%20/%20temple%20supplies.' target='_blank' rel='noopener' class='btn-primary' style='display:inline-block;'>Enquire on WhatsApp</a>"
  },
  contact: {
    title: "Contact Seva Desk",
    body: "<p><strong>WhatsApp &amp; Phone:</strong> +91 99452 43930<br><strong>Dispatch Hours:</strong> Monday – Saturday, 9:30 AM to 6:30 PM IST</p><br><a href='https://wa.me/919945243930?text=Hare%20Krishna!%20I%20have%20a%20question%20regarding%20SATTVA%20offerings.' target='_blank' rel='noopener' class='btn-primary' style='display:inline-block;'>Chat on WhatsApp</a>"
  },
  shipping: {
    title: "Shipping & Delivery",
    body: "<p>Orders are dispatched within 24–48 hours via insured Pan-India courier partners. Delivery typically takes 3–6 business days depending on your PIN code. Enjoy free shipping on all orders above ₹999 (₹60 flat shipping below ₹999).</p>"
  },
  track: {
    title: "Track Your Order",
    body: "<p>Share your Order ID (e.g., <strong>#STV-1042</strong>) with our Seva Desk on WhatsApp to receive your live courier tracking link immediately.</p><br><a href='https://wa.me/919945243930?text=Hare%20Krishna!%20Please%20share%20the%20tracking%20status%20for%20my%20Order%20ID:%20' target='_blank' rel='noopener' class='btn-primary' style='display:inline-block;'>Track via WhatsApp</a>"
  },
  replacement: {
    title: "Replacement Policy",
    body: "<p>If an item arrives damaged in transit or differs from your order, message us on WhatsApp within 48 hours of delivery with an unboxing photo and we will arrange a prompt replacement.</p>"
  },
  care: {
    title: "Care Instructions",
    body: "<p><strong>Tulsi Beads &amp; Kanti Mala:</strong> Keep dry and rub lightly with a drop of pure cow ghee or sandalwood oil occasionally.<br><br><strong>Handloom Dhoti &amp; Gopi Dress:</strong> Gentle cold hand-wash separately in mild detergent and dry in shade.</p>"
  },
  privacy: {
    title: "Privacy Policy",
    body: "<p>Your name, mobile number, and delivery address are used solely to fulfill and dispatch your SATTVA order. We never sell or share customer details with third-party marketers.</p>"
  },
  terms: {
    title: "Terms of Seva",
    body: "<p>All product prices are listed in Indian Rupees (INR). Prepaid UPI orders are verified against the UTR reference ID prior to dispatch.</p>"
  }
};

function openInfoModal(key) {
  const page = INFO_PAGES[key];
  if (!page) return;
  document.getElementById("infoModalTitle").textContent = page.title;
  document.getElementById("infoModalBody").innerHTML = page.body;
  document.getElementById("infoModalBackdrop").classList.add("open");
}

function closeInfoModal() {
  document.getElementById("infoModalBackdrop").classList.remove("open");
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// Initialize storefront and category carousel
initCategoryCarousel();
loadProducts();
