# Signatures

Drop the scanned signatures here as:

    director.png      — Academy Director
    instructor.png    — Lead Instructor

Requirements
------------
* Black ink on a **transparent** background (PNG). White paper also works —
  it is inverted for the dark sheet — but transparent is cleaner.
* Roughly 800×260, i.e. a wide strip. The signature should fill the width
  with only a little margin.
* Trim the surrounding whitespace, or it will render as a small mark
  floating in an empty box.

Wiring
------
Pass the paths through `CertData`:

    directorSig:   "/images/signatures/director.png"
    instructorSig: "/images/signatures/instructor.png"

Leave either one out and a drawn stand-in is used, so nothing breaks
before the real ones arrive.
