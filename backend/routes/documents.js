const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const Document = require("../models/Document");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

router.use(protect);

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const filter = { owner: req.user._id };
    if (q && q.trim()) {
      filter.name = { $regex: q.trim(), $options: "i" };
    }
    const docs = await Document.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: { documents: docs } });
  })
);

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 255 }),
    body("type").optional().isIn(["pdf", "image", "text"]),
    body("size").optional().isString(),
    body("mimeType").optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const { name, type = "text", size = "0 KB", mimeType = "" } = req.body;
    const doc = await Document.create({ owner: req.user._id, name, type, size, mimeType });
    res.status(201).json({ success: true, data: { document: doc } });
  })
);

router.patch(
  "/:id/rename",
  [
    param("id").isMongoId().withMessage("Invalid document id"),
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 255 }),
  ],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    doc.name = req.body.name.trim();
    await doc.save();
    res.json({ success: true, data: { document: doc } });
  })
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid document id")],
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) return;
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, message: "Document deleted" });
  })
);

module.exports = router;
