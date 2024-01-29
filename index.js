import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import { endianness } from "os";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
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
app.post("/create",(req,res)=>{
    const title = req.body["postTitle"];
    const content = req.body["postContent"];
    const contentHead = getContentHead(content);
    const currentDate = new Date().toLocaleDateString();
    const postId = getMaxId() + 1;
    saveData({ id:postId, title, content, contentHead, currentDate });
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

app.post("/edit/:postId", (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToUpdate = getPostById(postId);
    postToUpdate.title = req.body["postTitle"];
    postToUpdate.content = req.body["postContent"];
    postToUpdate.contentHead = getContentHead(req.body["postContent"]);
    updateData(postToUpdate);
    res.redirect("/");

})

app.post("/delete/:postId", (req,res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToDelete = getPostById(postId);
    deletePost(postToDelete);
    res.redirect("/");
})

app.get("/view/:postId", (req, res)=>{
    const postId = parseInt(req.params.postId, 10);
    const postToView = getPostById(postId);
    const view_head = "Post "+postToView.id;

    res.render("view.ejs",{
        head:view_head,
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