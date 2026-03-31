const express = require('express');
const router = express.Router();

const multer = require('multer')
const bcrypt = require("bcryptjs")

const storage = multer.diskStorage({
    destination:function(req, file, cb){
        cb(null, './public/images/products')
    },
    filename:function(req, file, cb){
        cb(null, Date.now()+".jpg")
    }
})

const upload = multer({ storage:storage })

const ConnectDB = require('../config/db');
const Product = require('../models/products')
const Member = require('../models/members')
const Sale = require('../models/sales')
const Promotion = require('../models/promotions')
const title = "Bread Shop";

// ─── Middleware ───────────────────────────────────────────────

function allowRoles(...roles) {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.position)) {
            return next()
        }
        return res.redirect("/login")   // เปลี่ยนจาก res.send("Access Denied") → redirect
    }
}

// ─── Public Routes ────────────────────────────────────────────

router.get("/", async (req, res) => {
    try {
        const products = await Product.find();
        res.render("index", {products:products, title: title});
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.get("/login", (req, res) => {
    res.render("login", { message: req.session.message })
})

router.post("/login", async (req, res) => {
    const { email, password } = req.body
    const user = await Member.findOne({ email })

    if (!user || !(await user.comparePassword(password))) {
        req.session.message = "Invalid email or passwords!"
        return res.redirect("/login")
    }

    req.session.user = user
    res.redirect("/")
})

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login")
    })
})

router.get("/register", async (req, res) => {
    const userCount = await Member.countDocuments()
    res.render("register/regisindex", {
        isFirstUser: userCount === 0,
        user: req.session.user || null,
        old: req.session.old || null,
        error: undefined
    })
})

router.post("/register", async (req, res) => {
    const { name, email, phone, password, confirmPassword, position } = req.body
    const oldData = { name, email, phone, position }
    const userCount = await Member.countDocuments()  // เพิ่มบรรทัดนี้
    const isFirstUser = userCount === 0              // เพิ่มบรรทัดนี้

    if (password !== confirmPassword) {
        return res.render("register/regisindex", {
            error: "Passwords do not match",
            old: oldData,
            isFirstUser,             // ส่งไปด้วย
            user: req.session.user || null
        })
    }

    try {
        const existingUser = await Member.findOne({ email })
        if (existingUser) {
            return res.render("register/regisindex", {
                error: "Email already registered",
                old: oldData,
                isFirstUser,         // ส่งไปด้วย
                user: req.session.user || null
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const newMember = new Member({ name, email, phone, password: hashedPassword, position })
        await newMember.save()
        res.redirect("/login")
    } catch (error) {
        console.error(error)
        res.render("register/regisindex", {
            error: "Error registering user",
            old: oldData,
            isFirstUser,             // ส่งไปด้วย
            user: req.session.user || null
        })
    }
})

router.get('/search', async (req, res) => {
    try {
        let minPrice = req.query.min ? parseFloat(req.query.min) : 0;
        let maxPrice = req.query.max ? parseFloat(req.query.max) : Number.MAX_VALUE;
        let products = await Product.find({ price: { $gte: minPrice, $lte: maxPrice } });
        res.render("index", {products:products, title: title});
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }    
});

router.get("/findindex", async (req, res) => {
    res.render('find');
});

router.get("/find", async (req, res) => {
    try {
        let query = {};
        if (req.query.name)          query.name  = { $eq: req.query.name };
        if (req.query.minPrice)      query.price = { ...query.price, $gte: parseInt(req.query.minPrice) };
        if (req.query.maxPrice)      query.price = { ...query.price, $lte: parseInt(req.query.maxPrice) };
        if (req.query.exclude)       query.name  = { $ne: req.query.exclude };
        if (req.query.highPriceOnly) query.price = { $gt: 5000 };
        if (req.query.lowPriceOnly)  query.price = { $lt: 2000 };

        const products = await Product.find(query);
        res.render("findResults", { products, title: "ผลการค้นหา" });
    } catch (error) {
        res.status(500).send("เกิดข้อผิดพลาด: " + error.message);
    }
});

// ─── Protected Routes ──────────

router.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login")
    }
    res.render("dashboard", { user: req.session.user })
})

router.get("/members", async (req, res) => {
    const title = "Members List"
    try {
        const members = await Member.find()
        res.render("members", { members: members, title: title, user: req.session.user })
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
})

router.post('/member/edit', async (req, res) => {
    const member = await Member.findById(req.body.id);
    res.render("editmember", { member, title: "Edit Member" });
});

router.post('/member/update', allowRoles("Admin"), async (req, res) => {
    await Member.findByIdAndUpdate(req.body.id, {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        position: req.body.position
    });
    res.redirect('/members');
});

router.get('/member/delete/:id', allowRoles("Admin"), async (req, res) => {
    await Member.findByIdAndDelete(req.params.id);
    res.redirect('/members');
});

router.get('/addForm', (req, res)=>{
    const title = "Add New Product";
    res.render('form',{title: title});
})

router.get('/manage', async (req, res)=>{
    const title = "Manage Product";
    try {
        const products = await Product.find(); 
        res.render("manage", {products:products, title: title}); 
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
})

router.post('/insert', allowRoles("Admin"), upload.single("image"), async (req, res) => {
    try {
        const newProduct = new Product({ 
            name: req.body.name, 
            price: req.body.price, 
            image: req.file ? req.file.filename : null, 
            description: req.body.description 
        });
        await newProduct.save();
        res.redirect('/');
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }    
});

router.get('/delete/:id', allowRoles("Admin"), async (req, res)=>{
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/manage'); 
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
})

router.post('/edit', async (req, res) => {
    const title = "Edit Product";
    try {
        const edit_id = req.body.id;
        const product = await Product.findOne({_id: edit_id}).exec();
        res.render('formedit', {product: product, title: title});
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }    
});

router.post('/update', allowRoles("Admin"), upload.single("image"), async (req, res) => {    
    try {
        const id = req.body.id;
        const data = { 
            name: req.body.name, 
            price: req.body.price, 
            description: req.body.description 
        };
        if (req.file) {
            data.image = req.file.filename;
        }
        await Product.findByIdAndUpdate(id, data, {useFindAndModify: false}).exec();
        res.redirect('/manage');
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }    
});

router.get("/sales/all", async (req, res) => {
    const sales = await Sale.find().populate("product").populate("member")
    res.render("sales/showsale", { sales })
})

router.get("/sales/new", allowRoles("Admin", "Cashier"), async (req, res) => {
    const products   = await Product.find()
    const members    = await Member.find()
    const promotions = await Promotion.find({ isActive: true })

    res.render("sales/newsale", {
        products,
        members,
        promotions,
        user: req.session.user,
        selectedProduct: req.query.productId || null,   // ส่งค่าไปให้ EJS
        selectedQty: parseInt(req.query.qty) || 1       // ส่งค่าไปให้ EJS
    })
})

router.post("/sales/insert", allowRoles("Admin", "Cashier"), async (req, res) => {
    try {
        const { product, member, quantity,
                promotion, paymentMethod,
                totalAmount, discount } = req.body

        // Validate ฝั่ง server อีกชั้น
        const productData = await Product.findById(product)
        if (!productData) return res.status(404).send("ไม่พบสินค้า")

        const qty = parseInt(quantity) || 1
        const subtotal = productData.price * qty
        const disc = parseFloat(discount)    || 0
        const total = parseFloat(totalAmount) || subtotal - disc

        const newSale = new Sale({
            product,
            member,
            quantity: qty,
            totalPrice: total,
            discount: disc,
            promotion: promotion || null,
            paymentMethod: paymentMethod || 'cash'
        })

        await newSale.save()
        res.redirect("/sales/all")

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server Error", error: error.message })
    }
})
router.get("/check-session", (req, res) => {
    if (req.session.user) {
        // ยัง login อยู่ → ส่งกลับหน้าเดิม
        return res.redirect("back")
    }
    // หมด session → ไป login
    res.redirect("/login")
})

// ─── Sales Chart API ──────────────────────────────────────────

router.get("/api/sales", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'กรุณาระบุ startDate และ endDate' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const salesData = await Sale.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    total: { $sum: "$totalPrice" }  // ใช้ field totalPrice จาก sales model
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const result = salesData.map(item => ({
            date: item._id,
            total: item.total
        }));

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// แสดงหน้า
router.get("/promotions", allowRoles("Admin"), async (req, res) => {
    const promotions = await Promotion.find().sort({ createdAt: -1 })
    res.render("promotions", { promotions, user: req.session.user })
})

// เพิ่ม
router.post("/promotions/insert", allowRoles("Admin"), async (req, res) => {
    try {
        const { name, type, value, minAmount, isActive } = req.body

        if (type === 'percent' && value > 100)
            return res.redirect("/promotions?error=ส่วนลด % ต้องไม่เกิน 100")
        if (type === 'minspend' && !minAmount)
            return res.redirect("/promotions?error=กรุณาระบุยอดขั้นต่ำ")

        await new Promotion({
            name, type,
            value:     parseFloat(value),
            minAmount: parseFloat(minAmount) || 0,
            isActive:  isActive === 'true'
        }).save()

        res.redirect("/promotions")
    } catch (err) {
        console.error(err)
        res.redirect("/promotions")
    }
})

// เปิด/ปิด
router.get("/promotions/toggle/:id", allowRoles("Admin"), async (req, res) => {
    const promo = await Promotion.findById(req.params.id)
    if (promo) {
        promo.isActive = !promo.isActive
        await promo.save()
    }
    res.redirect("/promotions")
})

// ลบ
router.get("/promotions/delete/:id", allowRoles("Admin"), async (req, res) => {
    await Promotion.findByIdAndDelete(req.params.id)
    res.redirect("/promotions")
})

// ─── /:id ไว้ท้ายสุดเสมอ ─────────────────────────────────────
router.get('/:id', async (req, res)=>{
    const title = "Product Detail";    
    try {
        const product_id = req.params.id;
        const product = await Product.findOne({_id: product_id}).exec(); 
        res.render("product", {product:product, title: title}); 
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
})

module.exports = router;
