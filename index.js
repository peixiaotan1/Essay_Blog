import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import multer from "multer";
import { endianness } from "os";

const app = express();
const port = 3000;

// 配置文件存储
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    // 替换文件名中的空格为下划线，避免URL问题
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + sanitizedName);
  }
});

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
    fileSize: 5 * 1024 * 1024, // 限制文件大小为5MB
    files: 10 // 限制最多10个文件
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
});

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
    
    // 处理多个图片
    const imagePaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    
    saveData({ 
        id: postId, 
        title, 
        author,
        content, 
        contentHead, 
        currentDate,
        imagePaths
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
    
    // 如果上传了新图片，更新图片路径数组
    if (req.files && req.files.length > 0) {
        postToUpdate.imagePaths = req.files.map(file => '/uploads/' + file.filename);
    }
    
    updateData(postToUpdate);
    res.redirect("/");
})

app.post("/delete/:postId", (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToDelete = getPostById(postId);
    deletePost(postToDelete);
    res.redirect("/");
})

// 删除单个图片的路由
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
            const imageToDelete = post.imagePaths[imageIndex];
            
            // 从数组中删除图片路径
            post.imagePaths.splice(imageIndex, 1);
            
            // 删除服务器上的图片文件
            const filePath = 'public' + imageToDelete;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            // 更新数据
            data[postIndex] = post;
            fs.writeFileSync('data.json', JSON.stringify(data));
            
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

function loadData() {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Function to save data to the file
function saveData(post) {
    const data = loadData();
    data.push(post);
    fs.writeFileSync('data.json', JSON.stringify(data));
}

function updateData(updatedPost){
    const data = loadData();
    const index = data.findIndex(post => post.id === updatedPost.id);
    data[index] = updatedPost;
    fs.writeFileSync('data.json', JSON.stringify(data));
}

function deletePost(postToDelete){
    const data = loadData();
    const index = data.findIndex(post => post.id === postToDelete.id);
    data.splice(index,1);
    fs.writeFileSync('data.json', JSON.stringify(data));
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