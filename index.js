const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;

// 配置文件存储 - 使用内存存储，因为Vercel不支持文件系统写入
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
});

// 设置EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// 中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// 内存数据存储 - Vercel兼容版本
let memoryData = [
    {
        id: 1,
        title: "Welcome to My Blog",
        author: "Admin",
        content: "This is a blog system built with Node.js and Express. It runs on Vercel and supports creating, editing, and deleting articles.",
        contentHead: "This is a blog system built with Node.js and Express. It runs on Vercel and supports creating, editing, and deleting articles.",
        currentDate: new Date().toLocaleDateString(),
        imagePaths: [
            "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop"
        ]
    },
    {
        id: 2,
        title: "Tech Stack Introduction",
        author: "Developer",
        content: "This project uses the following technologies: Node.js, Express.js, EJS template engine, Multer file upload, and Vercel deployment platform.",
        contentHead: "This project uses the following technologies: Node.js, Express.js, EJS template engine, Multer file upload, and Vercel deployment platform.",
        currentDate: new Date().toLocaleDateString(),
        imagePaths: [
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop",
            "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
            "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop"
        ]
    }
];

function loadData() {
    return memoryData;
}

function saveData(post) {
    memoryData.push(post);
}

function updateData(updatedPost){
    const index = memoryData.findIndex(post => post.id === updatedPost.id);
    if (index !== -1) {
        memoryData[index] = updatedPost;
    }
}

function deletePost(postToDelete){
    const index = memoryData.findIndex(post => post.id === postToDelete.id);
    if (index !== -1) {
        memoryData.splice(index, 1);
    }
}

function getPostById(postId) {
    const data = loadData();
    return data.find(post => post.id === postId);
}

function getMaxId(){
    const data = loadData();
    if (data.length === 0){
        return 0;
    }
    const maxId = Math.max(...data.map(post => post.id));
    return maxId;
}

function getContentHead(content){
    const wordsArray = content.split(' ');
    const contentHead = wordsArray.slice(0,10).join(' ');
    return contentHead;
}

// 路由
app.get("/", (req,res)=>{
    const main_head = "My Terrible Blog";
    const data = loadData();
    res.render("index.ejs",{head:main_head, posts:data});
})

app.get("/create",(req,res)=>{
    const create_head = "Create Post";
    res.render("create.ejs",{head:create_head});
});

app.post("/create", upload.array('postImages', 10), (req,res)=>{
    const title = req.body["postTitle"];
    const author = req.body["postAuthor"];
    const content = req.body["postContent"];
    const contentHead = getContentHead(content);
    const currentDate = new Date().toLocaleDateString();
    const postId = getMaxId() + 1;
    
    // 在Vercel环境中，为新文章添加示例图片
    const sampleImages = [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop"
    ];
    
    saveData({ 
        id: postId, 
        title, 
        author,
        content, 
        contentHead, 
        currentDate,
        imagePaths: sampleImages
    });
    res.redirect('/');    
})

app.get("/edit/:postId", (req,res)=>{
    const edit_head = "Edit Post";
    const postId = parseInt(req.params.postId, 10);
    const postToEdit = getPostById(postId);

    res.render("edit.ejs",{
        head: edit_head,
        postId: postId,
        post: postToEdit});
})

app.post("/edit/:postId", upload.array('postImages', 10), (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToUpdate = getPostById(postId);
    postToUpdate.title = req.body["postTitle"];
    postToUpdate.author = req.body["postAuthor"];
    postToUpdate.content = req.body["postContent"];
    postToUpdate.contentHead = getContentHead(req.body["postContent"]);
    
    // 在Vercel环境中，保持现有图片路径不变
    // postToUpdate.imagePaths 保持不变
    
    updateData(postToUpdate);
    res.redirect("/");
})

app.post("/delete/:postId", (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToDelete = getPostById(postId);
    deletePost(postToDelete);
    res.redirect("/");
})

// 删除单个图片的路由 - Vercel版本（仅从数据中删除，不删除文件）
app.post("/delete-image/:postId", (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const { imagePath, imageIndex } = req.body;
    
    try {
        const data = loadData();
        const postIndex = data.findIndex(post => post.id === postId);
        
        if (postIndex === -1) {
            return res.json({ success: false, error: 'Post not found' });
        }
        
        const post = data[postIndex];
        
        // 从图片路径数组中删除指定的图片
        if (post.imagePaths && post.imagePaths.length > imageIndex) {
            // 从数组中删除图片路径
            post.imagePaths.splice(imageIndex, 1);
            
            // 更新数据
            memoryData[postIndex] = post;
            
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Image not found' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.json({ success: false, error: 'Server error' });
    }
})

app.get("/view/:postId", (req, res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToView = getPostById(postId);
    const view_head = "Post "+postToView.id;

    res.render("view.ejs",{
        head:view_head,
        post: postToView
    });
})

// 启动服务器
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, ()=>{
        console.log(`Listening on port ${port}`);
    });
}

// 导出app供Vercel使用
module.exports = app;