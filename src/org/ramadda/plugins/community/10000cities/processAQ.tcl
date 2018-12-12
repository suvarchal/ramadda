set ::scriptDir [file dirname [info script]]
source ~/bin/lib.tcl
source ~/bin/utils.tcl


puts "<entries>"
proc process {country state city location lat lon} {
    if {![info exists ::states($state)]} {
        puts "<entry id=\"$state\" type=\"folder\" name=\"$state\"/>"
        set ::states($state) 1
    }
    set inner  "\n"
    append inner [xmlTag name [xmlCdata "$city - $location"] {}] 
    append inner [xmlTag country [xmlCdata $country] {}] 
    append inner [xmlTag city [xmlCdata $city] {}] 
    append inner [xmlTag location [xmlCdata $location] {}] 
    append inner "\n"
    set attrs [list parent $state type type_point_openaq  lat $lat lon $lon]
    puts [xmlTag entry $inner  $attrs]
    puts "</entries>"
    exit
}
source $::scriptDir/aqstations.tcl
puts "</entries>"


