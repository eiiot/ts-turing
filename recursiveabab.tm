Start:
    If Blank Return True
    If 'b' Return False
    Write Blank

ZipRight:
    Move Right
    If Not Blank Goto ZipRight
    Move Left
    If Not 'b' Return False
    Write Blank

ZipLeft:
    Move Left
    If Not Blank Goto ZipLeft
    Move Right
    Goto Start
