import React from "react";

const PostCard = ({ title, content, image, date, onReadMore }) => {
    const defaultImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80";

    return (
        <div className="card shadow-sm h-100 w-100  " style={{ border: "1px solid #eee" }}>
            <div style={{ height: "140px", overflow: "hidden" }}>
                <img
                    src={image || defaultImage}
                    className="card-img-top w-100 h-100"
                    alt={title}
                    style={{ objectFit: "cover" }}
                />
            </div>
            <div className="card-body d-flex flex-column p-3">
                <h6 className="card-title text-truncate fw-bold mb-1" style={{ fontSize: "1rem" }}>{title}</h6>
                <p className="text-muted mb-2" style={{ fontSize: "0.7rem" }}>{date}</p>
                <p className="card-text flex-grow-1" style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontSize: "0.8rem",
                    lineHeight: "1.4"
                }}>
                    {content}
                </p>
                <button 
                    className="btn btn-primary btn-sm w-10 mt-2" 
                    onClick={() => onReadMore && onReadMore()}
                    style={{ fontSize: "0.8rem", padding: "5px" }}
                >
                    Leer más
                </button>
            </div>
        </div>
    );
};

export default PostCard;