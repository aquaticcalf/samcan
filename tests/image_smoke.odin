package main

import "core:encoding/base64"
import "core:fmt"
import "core:os"

import document "../src/document"
import storage "../src/storage"

main :: proc() {
    png_path := "build/image-smoke.png"
    png_data, decode_error := base64.decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    )
    assert(decode_error == nil, "could not decode png fixture")
    assert(os.write_entire_file(png_path, png_data) == nil, "could not write png fixture")
    delete(png_data)

    doc := document.new()
    defer document.destroy(&doc)
    assert(storage.import_image(&doc, png_path, 100, 80), "could not import png fixture")
    assert(len(doc.elements) == 1, "image import did not add one element")
    assert(doc.elements[0].kind == .image, "image import kind was wrong")
    assert(doc.elements[0].width == 1, "image width was wrong")
    assert(doc.elements[0].height == 1, "image height was wrong")
    assert(len(doc.images) == 1, "image import did not add an asset")
    fmt.println("image smoke passed")
    _ = os.remove(png_path)
}
